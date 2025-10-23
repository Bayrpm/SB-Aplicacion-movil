import { useAuth } from '@/app/features/auth';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function CentralReportButton(props: BottomTabBarButtonProps) {
  const scheme = useColorScheme();
  const borderColor = '#0A4A90';
  const innerBg = scheme === 'dark' ? '#000000' : '#FFFFFF';
  return (
    <View style={styles.centralButtonWrapper} pointerEvents="box-none">
      <TouchableOpacity
        onPress={props.onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        style={[
          styles.centralButton,
          { borderColor, backgroundColor: innerBg },
        ]}
      >
        <IconSymbol name="location.fill" size={34} color={scheme === 'dark' ? '#FFFFFF' : '#0A4A90'} />
        <Text style={[styles.centralButtonText, { color: scheme === 'dark' ? '#FFFFFF' : '#0A4A90' }]}>Reportar</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, loading, isInspector, inspectorLoading, roleCheckFailed } = useAuth();
  const [showOverlay, setShowOverlay] = useState(false);

  React.useEffect(() => {
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

  if (loading || inspectorLoading || typeof isInspector === 'undefined') {
    return null;
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
                tabBarButton: CentralReportButton,
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