import { useThemeColor } from '@/hooks/use-theme-color';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Appearance, Easing, Linking, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, SplashScreen, useAuth } from '@/app/features/auth';
import { ReportModalProvider, useReportModal } from '@/app/features/report/context';
import { unregisterPushNotifications } from '@/app/services/notificationService';
import AlertBox from '@/components/ui/AlertBox';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotifications } from '@/hooks/useNotifications';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Componente para manejar deep links con acceso al contexto
function DeepLinkHandler() {
  const router = useRouter();
  const { openReportDetail } = useReportModal();
  const { session, isInspector } = useAuth();

  useEffect(() => {
    // Solo manejar deep links si hay sesión activa
    if (!session) return;

    // Manejar el link inicial si la app se abre desde un deep link
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    // Manejar deep links cuando la app ya está abierta
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    handleInitialURL();

    return () => {
      subscription.remove();
    };
  }, [session, isInspector]);

  const handleDeepLink = (url: string) => {
    // Formato esperado: sbaplicacionmovil://report/{reportId}
    const match = url.match(/sbaplicacionmovil:\/\/report\/(.+)/);
    if (match && match[1]) {
      const reportId = match[1];

      // Si el usuario actual es inspector, no abrimos el modal ciudadano.
      // En su lugar, navegamos al flujo de inspector y descartamos el deep link.
      if (isInspector) {
        try {
          router.push('/(tabs)/inspector/inspectorHome' as any);
        } catch (e) {
          // noop
        }
        return;
      }

      // Navegar al home del ciudadano
      router.push('/(tabs)/citizen/citizenHome' as any);

      // Esperar un momento para que la navegación se complete y luego abrir el modal
      setTimeout(() => {
        openReportDetail(reportId);
      }, 500);
    }
  };

  return null; // Este componente no renderiza nada
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, loading, isInspector, inspectorLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // Inicializar notificaciones push
  const { notificationToken } = useNotifications();
  
  // Mantener la Splash visible hasta que la navegación esté alineada con el estado de auth
  const [navReady, setNavReady] = useState(false);
  // Asegurar un mínimo de 5s de Splash visible
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  // Control de overlay animado para desvanecer la Splash
  const [splashVisible, setSplashVisible] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const splashScale = useRef(new Animated.Value(1)).current;
  // Animación de entrada del contenido (Welcome/Tabs): fade-through
  const appOpacity = useRef(new Animated.Value(0)).current;
  const appTranslateY = useRef(new Animated.Value(8)).current; // leve desplazamiento hacia arriba
  const appScale = useRef(new Animated.Value(0.995)).current;

  // Limpiar token de notificación al cerrar sesión
  useEffect(() => {
    if (!session) {
      unregisterPushNotifications();
    }
  }, [session]);

  // Cargar y aplicar tema guardado al iniciar la app
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@theme_mode');
        if (savedTheme) {
          if (savedTheme === 'light') {
            Appearance.setColorScheme('light');
          } else if (savedTheme === 'dark') {
            Appearance.setColorScheme('dark');
          } else {
            Appearance.setColorScheme(null); // Usar tema del sistema
          }
        }
      } catch (error) {
        console.error('Error cargando tema:', error);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMinSplashElapsed(true), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Esperar a que termine el chequeo de auth antes de decidir navegación
    if (loading) return;

    const inAuthGroup = segments[0]?.includes('auth');

    // Si el grupo actual no coincide con el estado de auth, redirigir.
    if (!session && !inAuthGroup) {
      router.replace('/(auth)' as any);
      return; // Mantener Splash hasta que cambien los segmentos
    }

    // Si hay sesión y estamos en el grupo de auth, esperar la resolución del rol
    // desde el AuthProvider (isInspector/inspectorLoading). Incluir estos valores
    // en las dependencias para que la navegación se re-evalúe cuando cambien.
    if (session && inAuthGroup) {
      // Esperar siempre hasta que `isInspector` sea un booleano definido o hasta
      // que el provider indique que sigue cargando la comprobación.
      if (inspectorLoading || typeof isInspector !== 'boolean') return; // esperar a que termine la comprobación

      const target = isInspector
        ? '/(tabs)/inspector/inspectorHome'
        : '/(tabs)/citizen/citizenHome';
      router.replace(target as any);
      return; // Mantener Splash hasta que cambien los segmentos
    }

    // Si estamos alineados (grupo correcto según auth), ya podemos salir del Splash
    setNavReady(true);
  }, [session, segments, loading, isInspector, inspectorLoading]);

  // Iniciar animación cuando navegación esté lista y se cumplan los 5s mínimos
  useEffect(() => {
    if (navReady && minSplashElapsed && splashVisible) {
      // Crossfade: desvanecer Splash y a la vez mostrar contenido con leve desplazamiento
      Animated.parallel([
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 1400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(splashScale, {
          toValue: 0.985,
          duration: 1400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(appOpacity, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(appTranslateY, {
          toValue: 0,
          duration: 1400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(appScale, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setSplashVisible(false);
        }
      });
    }
  }, [navReady, minSplashElapsed, splashVisible, splashOpacity, splashScale, appOpacity, appTranslateY, appScale]);

  // Exponer el estado de splash a nivel global para que otros componentes
  // (por ejemplo el TabLayout) sepan si la splash está visible y eviten
  // mostrar overlays/modal sobre ella.
  useEffect(() => {
    try {
      (global as any).__APP_SPLASH_VISIBLE__ = splashVisible;
    } catch (e) {
      // noop
    }
  }, [splashVisible]);

  return (
    <>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* Only render the app Slot once the splash is fully hidden to avoid
            overlays/modal components (like Tabs' ActivityIndicator) from
            appearing on top of the splash. This prevents the loading overlay
            during cold start when session exists. */}
          {/* Render the app Slot only after the splash has finished its animation
              to avoid any mismatch between the native splash and RN content. */}
          <Animated.View
            style={{
              flex: 1,
              opacity: appOpacity,
              transform: [
                { translateY: appTranslateY },
                { scale: appScale },
              ],
            }}
          >
            <ReportModalProvider>
              <DeepLinkHandler />
              <Slot />
            </ReportModalProvider>
          </Animated.View>
        {/* Make the native status bar opaque and match the app background to
            avoid RN content showing through under the status bar when scrolling. */}
        <StatusBar
          style={colorScheme === 'dark' ? 'light' : 'dark'}
          translucent={false}
          backgroundColor={useThemeColor({}, 'background')}
        />
      </ThemeProvider>

      {splashVisible && (
        <Animated.View
          pointerEvents="auto"
          style={[
            StyleSheet.absoluteFillObject,
            { zIndex: 9999, opacity: splashOpacity, transform: [{ scale: splashScale }] },
          ]}
        >
          <SplashScreen />
        </Animated.View>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
      {/* Mount global AlertBox so calls to Alert.alert(...) can be redirected if desired */}
      <AlertBox />
    </AuthProvider>
  );
}

// NOTE: removed global monkey-patch of RN Alert.alert to prefer explicit migration to AppAlert
