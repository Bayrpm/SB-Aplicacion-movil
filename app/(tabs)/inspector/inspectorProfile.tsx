import React from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProfileHeader from '@/app/features/profileCitizen/components/profileHeader';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

import TurnCard from '@/app/features/profileInspector/components/turnCardComponent';

const { height } = Dimensions.get('window');



export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  const containerBg = useThemeColor({ light: '#F5F5F5', dark: '#000000' }, 'background');
  const actionButtonBg = useThemeColor({ light: '#FFFFFF', dark: '#071229' }, 'background');
  const logoutIconColor = '#FF5050'; // Rojo siempre
  const settingsIconColor = colorScheme === 'dark' ? '#FFFFFF' : '#4B5563';

  // 🔹 Datos estáticos de ejemplo (luego los reemplazas con datos reales)
  const userName = 'Nombre Apellido';
  const userEmail = 'correo@ejemplo.com';
  const userPhone = '+56 9 1234 5678';
  const userInitials = 'NA';

  return (
    <View style={[styles.container, { backgroundColor: containerBg, paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 }, // espacio para tab bar u otros elementos
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.headerWrapper}>
          <ProfileHeader
            userName={userName}
            userEmail={userEmail}
            userPhone={userPhone}
            userInitials={userInitials}
            avatarUrl={null}
            onAvatarUpdated={() => {}}
            onEditPress={() => {}}
            onHeightChange={() => {}}
          />

          {/* Botón Cerrar sesión (solo visual por ahora) */}
          <TouchableOpacity
            style={[
              styles.signOutButton,
              {
                backgroundColor: actionButtonBg,
                top: 14,
                left: Math.max(16, insets.left + 8),
              },
            ]}
            activeOpacity={0.7}
            onPress={() => {}}
          >
            <IconSymbol name="exit-to-app" size={28} color={logoutIconColor} />
          </TouchableOpacity>

          {/* Botón Configuración (solo visual por ahora) */}
          <TouchableOpacity
            style={[
              styles.settingsButton,
              {
                backgroundColor: actionButtonBg,
                top: 14,
                right: Math.max(16, insets.right + 8),
              },
            ]}
            activeOpacity={0.7}
            onPress={() => {}}
          >
            <IconSymbol name="settings" size={28} color={settingsIconColor} />
          </TouchableOpacity>
        </View>

        {/* Espacio entre header y contenido */}
        <View style={styles.headerSpacer} />

<View></View>

          {/* Informacion card turnos */}
    <View style={styles.container}>
      <TurnCard
        shiftTitle="Turno mañana"
        schedule="06:00 am - 13:00 pm"
        statusText="Estado: Activo."
        timeAgo="Hace 2 horas."
        place="Trebol"
        onPressDetail={() => {
          console.log('Ver detalle del turno');
        }}
        onCloseShift={() => {
          console.log('Cerrar turno');
        }}
      />
    </View>   
      </ScrollView>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    
  },
  signOutButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  settingsButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerWrapper: {
    height: Math.min(350, height * 0.35), // igual que antes, pero sin lógica extra
    minHeight: 280,
    position: 'relative',
  },
  headerSpacer: {
    height: 20,
  },


});
