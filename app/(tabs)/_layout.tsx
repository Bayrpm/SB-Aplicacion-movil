import { Tabs } from 'expo-router';

import { useAuth } from '@/app/features/auth';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useMemo } from 'react';
import { ActivityIndicator, Modal, Platform, View } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();

  // Determinar rol: inspector si el email termina con @sanbernardo.cl
  const isInspector = useMemo(() => {
    const email = user?.email ?? '';
    return email.toLowerCase().endsWith('@sanbernardo.cl');
  }, [user]);

  // Mientras cargan datos de auth, mostramos overlay nativo con ActivityIndicator
  if (loading) {
    return (
      <Modal visible transparent animationType="fade" hardwareAccelerated={Platform.OS === 'android'} statusBarTranslucent onRequestClose={() => {}}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' }}>
          <ActivityIndicator size={120} color="#0A4A90" />
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
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}>

      {/* Citizen screens: visibles sólo si NO es inspector */}
      <Tabs.Screen
        name="citizen/citizenHome"
        options={
          !isInspector
            ? {
                title: 'Home',
                tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
                tabBarItemStyle: { flex: 1 },
              }
            : {
                // oculta la pestaña completamente para que no ocupe espacio
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
                tabBarIcon: ({ color }) => <IconSymbol size={28} name="location.fill" color={color} />,
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
                title: 'Usuario',
                tabBarIcon: ({ color }) => <IconSymbol size={30} name="person.fill" color={color} />,
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
                tabBarIcon: ({ color }) => <IconSymbol size={30} name="house.fill" color={color} />,
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
                tabBarIcon: ({ color }) => <IconSymbol size={30} name="notification.fill" color={color} />,
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
                tabBarIcon: ({ color }) => <IconSymbol size={30} name="person.fill" color={color} />,
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
