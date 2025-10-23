import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, SplashScreen, useAuth } from '@/app/features/auth';
import AlertBox from '@/components/ui/AlertBox';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, loading, isInspector, inspectorLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
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
      if (inspectorLoading) return; // esperar a que termine la comprobación

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
            <Slot />
          </Animated.View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
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
