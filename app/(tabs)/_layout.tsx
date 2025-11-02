import { useAuth } from '@/app/features/auth';
// ReportPickerModal se muestra desde la pantalla `citizenReport` via tabPress
import { useReportModal } from '@/app/features/report/context';
import { FontSizeProvider } from '@/app/features/settings/fontSizeContext';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Tabs, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Some navigator props (sceneContainerStyle) aren't exposed via the typed Tabs from expo-router.
// We'll keep a typed alias to allow passing JS-only props when necessary.
const TabsAny = Tabs as any;

function CentralReportButton(props: BottomTabBarButtonProps) {
  const scheme = useColorScheme();
  const borderColor = '#0A4A90';
  // Usar el estado de accesibilidad que React Navigation pasa a la custom tab button
  // o, como fallback, comprobar los segmentos de ruta para determinar si
  // estamos en la pantalla de reportes. Esto evita casos donde accessibilityState
  // no se propaga inmediatamente.
  const segments = useSegments();
  const isActive = !!props.accessibilityState?.selected || (segments as string[]).includes('citizenReport');
  // El fondo del botón debe seguir el tema del sistema (oscuro/claro).
  // Solo el icono y el texto cambian de color cuando el tab está activo.
  // Mantener azul como color principal tanto en light como dark para este tab.
  const innerBg = scheme === 'dark' ? '#000000' : '#FFFFFF';
  const BLUE = '#0A4A90';
  // En modo claro usamos azul activo / azul opaco inactivo.
  // En modo oscuro usamos blanco activo / blanco opaco inactivo.
  const activeColor = scheme === 'dark' ? '#FFFFFF' : BLUE;
  const inactiveColor = scheme === 'dark' ? 'rgba(255,255,255,0.56)' : 'rgba(10,74,144,0.56)';
  const iconColor = isActive ? activeColor : inactiveColor;
  const textColor = isActive ? activeColor : inactiveColor;
  const handlePress = () => {
    try { (props as any).onPress?.(); } catch (e) {}
  };

  return (
    <View style={styles.centralButtonWrapper} pointerEvents="box-none">
      <TouchableOpacity
        onPress={handlePress}
  activeOpacity={1}
        accessibilityRole="button"
        style={[
          styles.centralButton,
          { borderColor, backgroundColor: innerBg },
        ]}
      >
  <IconSymbol name="location.fill" size={48} color={iconColor} />
  <Text style={[styles.centralButtonText, { color: textColor }]}>Reportar</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, loading, isInspector, inspectorLoading, roleCheckFailed } = useAuth();
  const [showOverlay, setShowOverlay] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isReportFormOpen } = useReportModal();
  const segments = useSegments();

  // En Android la diferencia entre screen y window suele reflejar la navigation bar (soft keys)
  const navBarHeightAndroid = Platform.OS === 'android' ? Math.max(0, Dimensions.get('screen').height - Dimensions.get('window').height) : 0;
  const extraBottom = Math.max(insets.bottom || 0, navBarHeightAndroid || 0);
  const TAB_BAR_BASE = 72; // altura base usada antes
  const tabBarHeight = TAB_BAR_BASE + extraBottom;

  useEffect(() => {
    let mounted = true;
    let t: number | undefined;
    if (loading || inspectorLoading) {
      t = setTimeout(() => {
        if (mounted) setShowOverlay(true);
      }, 300);
    } else {
      setShowOverlay(false);
    }
    return () => {
      mounted = false;
      if (t) clearTimeout(t);
    };
  }, [loading, inspectorLoading]);

  // Navegar al tab correcto cuando el rol se define
  useEffect(() => {
    if (!loading && !inspectorLoading && typeof isInspector === 'boolean') {

  const segs = (segments as string[]) || [];
  const alreadyInside = segs.includes('citizen') || segs.includes('inspector');
      if (!alreadyInside) {
        const routePath = isInspector ? '/inspector/inspectorHome' : '/citizen/citizenHome';
        router.replace(routePath);
      }
    }
  }, [loading, inspectorLoading, isInspector, router]);

  const splashVisibleGlobal =
    typeof (globalThis as any).__APP_SPLASH_VISIBLE__ !== 'undefined'
      ? (globalThis as any).__APP_SPLASH_VISIBLE__
      : false;
  if (showOverlay && !splashVisibleGlobal) {
    return (
      <Modal visible transparent animationType="fade" hardwareAccelerated={Platform.OS === 'android'} statusBarTranslucent onRequestClose={() => {}}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' }}>
          <ActivityIndicator size={120} color="#0A4A90" />
        </View>
      </Modal>
    );
  }

  // Renderizar <Tabs> solo cuando el rol está definido y no hay loading
  if (loading || inspectorLoading || typeof isInspector !== 'boolean') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' }}>
        <ActivityIndicator size={80} color="#0A4A90" />
      </View>
    );
  }

  if (roleCheckFailed) {
    return (
      <Modal visible transparent animationType="fade" hardwareAccelerated={Platform.OS === 'android'} statusBarTranslucent onRequestClose={() => {}}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, alignItems: 'center' }}>
            <ActivityIndicator size={60} color="#0A4A90" />
            <Text style={{ marginTop: 12, color: '#0A4A90', fontWeight: '600' }}>Verificando rol del usuario...</Text>
            <Text style={{ marginTop: 8, color: '#222' }}>Si este mensaje persiste, contacta al soporte.</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <>
      <FontSizeProvider>
  {/* Background panel under the tab bar to avoid seeing app content through it.
    Use full tabBarHeight and anchor to bottom:0 so it always covers the area
    regardless of extraBottom/platform differences. */}
  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: tabBarHeight, backgroundColor: '#222', zIndex: 998 }} />

    <TabsAny
      initialRouteName={isInspector ? 'inspector/inspectorHome' : 'citizen/citizenHome'}
      sceneContainerStyle={{ paddingBottom: tabBarHeight }}
      screenOptions={{
        // Forzar que el contenido de cada pantalla reserve espacio inferior igual a tabBarHeight
        // note: contentStyle on bottom tabs isn't always typed; we still keep tabBar absolute anchoring
  tabBarActiveTintColor: '#FFFFFF',
        headerShown: false,
        tabBarShowLabel: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: extraBottom, // ancla la tab bar justo encima de la barra de navegación del sistema
          height: TAB_BAR_BASE,
          paddingBottom: 12,
          paddingTop: 8,
          overflow: 'visible',
          backgroundColor: '#0A4A90',
          borderTopWidth: 0,
          elevation: 12,
          zIndex: 999,
          display: isReportFormOpen ? 'none' : 'flex',
        },
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      {/* Citizen screens: visibles sólo si NO es inspector */}
      <Tabs.Screen
        name="citizen/citizenHome"
        options={
          !isInspector
            ? {
                tabBarIcon: ({ color }) => (
                  <View style={{ width: 72, height: 52, marginTop: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <IconSymbol size={46} name="house.fill" color={color} />
                  </View>
                ),
                tabBarItemStyle: { flex: 1 },
              }
            : {
                tabBarItemStyle: { display: 'none' },
              }
        }
      />
      <Tabs.Screen
        name="citizen/citizenReport"
        options={
          !isInspector
            ? {
                title: 'reportes',
                tabBarButton: (props) => <CentralReportButton {...props} />, // Usar focused
                tabBarIcon: ({ color }) => (
                  <View style={{ width: 72, height: 52, marginTop: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <IconSymbol size={46} name="location.fill" color={color} />
                  </View>
                ),
                tabBarItemStyle: { flex: 1 },
              }
            : {
                tabBarItemStyle: { display: 'none' },
              }
        }
      />
      <Tabs.Screen
        name="citizen/citizenProfile"
        options={
          !isInspector
            ? {
                tabBarIcon: ({ color }) => (
                  <View style={{ width: 72, height: 52, marginTop: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <IconSymbol size={46} name="person.fill" color={color} />
                  </View>
                ),
                tabBarItemStyle: { flex: 1 },
              }
            : {
                tabBarItemStyle: { display: 'none' },
              }
        }
      />

      {/* Inspector screens: visibles sólo si es inspector */}
      <Tabs.Screen
        name="inspector/inspectorHome"
        options={
          isInspector
            ? {
                title: 'Inicio',
                tabBarIcon: ({ color }) => (
                  <View style={{ width: 72, height: 52, marginTop: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <IconSymbol size={36} name="house.fill" color={color} />
                  </View>
                ),
                tabBarItemStyle: { flex: 1 },
              }
            : {
                tabBarItemStyle: { display: 'none' },
              }
        }
      />
      <Tabs.Screen
        name="inspector/inspectorNotification"
        options={
          isInspector
            ? {
                title: 'notificaciones',
                tabBarIcon: ({ color }) => (
                  <View style={{ width: 72, height: 52, marginTop: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <IconSymbol size={36} name="notification.fill" color={color} />
                  </View>
                ),
                tabBarItemStyle: { flex: 1 },
              }
            : {
                tabBarItemStyle: { display: 'none' },
              }
        }
      />
      <Tabs.Screen
        name="inspector/inspectorProfile"
        options={
          isInspector
            ? {
                title: 'perfil',
                tabBarIcon: ({ color }) => (
                  <View style={{ width: 72, height: 52, marginTop: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <IconSymbol size={36} name="person.fill" color={color} />
                  </View>
                ),
                tabBarItemStyle: { flex: 1 },
              }
            : {
                tabBarItemStyle: { display: 'none' },
              }
        }
      />
  </TabsAny>
  {/* ReportPickerModal se muestra desde la pantalla `citizen/citizenReport` (escucha tabPress) */}
      </FontSizeProvider>
    </>
  );
}

const styles = StyleSheet.create({
  centralButtonWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -46,
    alignItems: 'center',
    zIndex: 10,
  },
  centralButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  centralButtonImage: {
    width: 36,
    height: 36,
    marginBottom: 6,
  },
  centralButtonText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'none',
  },
});