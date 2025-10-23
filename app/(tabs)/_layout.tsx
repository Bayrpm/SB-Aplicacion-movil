import { useAuth } from '@/app/features/auth';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function CentralReportButton(props: BottomTabBarButtonProps) {
  const scheme = useColorScheme();
  const borderColor = '#0A4A90';
  const innerBg = scheme === 'dark' ? '#000000' : '#FFFFFF';
  const pathname = usePathname();
  // Determinar si el tab está activo comparando la ruta actual con la ruta del botón
  // El nombre de la ruta del botón se obtiene de props.route.name
  // El tab de reportar puede ser 'citizenReport' o 'inspectorReport'
  const isActive = pathname?.includes('citizenReport') || pathname?.includes('inspectorReport');
  const activeColor = scheme === 'dark' ? '#FFFFFF' : '#0A4A90';
  const inactiveColor = scheme === 'dark' ? '#888888' : '#B0B0B0'; // gris sólido
  const iconColor = isActive ? activeColor : inactiveColor;
  const textColor = isActive ? activeColor : inactiveColor;
  return (
    <View style={styles.centralButtonWrapper} pointerEvents="box-none">
      <TouchableOpacity
        onPress={props.onPress}
  activeOpacity={1}
        accessibilityRole="button"
        style={[
          styles.centralButton,
          { borderColor, backgroundColor: innerBg },
        ]}
      >
        <IconSymbol name="location.fill" size={34} color={iconColor} />
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
      const routePath = isInspector ? '/inspector/inspectorHome' : '/citizen/citizenHome';
      router.replace(routePath);
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
    <Tabs
      initialRouteName={isInspector ? 'inspector/inspectorHome' : 'citizen/citizenHome'}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
          overflow: 'visible',
          backgroundColor: '#0A4A90',
          borderTopWidth: 0,
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
    </Tabs>
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
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'none',
  },
});