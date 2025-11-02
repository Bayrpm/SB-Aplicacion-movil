import { useAuth } from '@/app/features/auth';
import { mapSupabaseErrorMessage } from '@/app/features/auth/api/auth.api';
import { getCitizenProfile, type CitizenProfile } from '@/app/features/profileCitizen/api/profile.api';

import EditProfileModal from '@/app/features/profileCitizen/components/editProfileModal';
import ProfileHeader from '@/app/features/profileCitizen/components/profileHeader';
import ReportsList from '@/app/features/profileCitizen/components/reportsList';
import SettingsModal from '@/app/features/profileCitizen/components/settingsModal';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, isInspector, inspectorLoading, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconColor = useThemeColor({ light: '#0A4A90', dark: '#FFFFFF' }, 'tint');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1D1D1D' }, 'background');
  const containerBg = useThemeColor({ light: '#F5F5F5', dark: '#000000' }, 'background');
  
  // Colores para botones mejorados para modo oscuro
  const logoutButtonBg = useThemeColor(
    { light: 'rgba(255, 80, 80, 0.3)', dark: 'rgba(255, 80, 80, 0.5)' }, 
    'background'
  );
  const logoutIconColor = '#FF5050'; // Rojo siempre
  
  const settingsButtonBg = useThemeColor(
    { light: 'rgba(202, 195, 195, 0.3)', dark: 'rgba(255, 255, 255, 0.2)' }, 
    'background'
  );
  // Usar colorScheme directamente para el icono de settings
  const settingsIconColor = colorScheme === 'dark' ? '#FFFFFF' : '#4B5563';
  
  const [profile, setProfile] = React.useState<CitizenProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = React.useState(false);

  // Cargar el perfil del ciudadano
  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await getCitizenProfile();
      
      if (error) {
        console.error('Error al cargar perfil:', error);
        AppAlert.alert('Error', 'No se pudo cargar el perfil');
        return;
      }
      
      setProfile(data);
    } catch (error) {
      console.error('Error inesperado:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar perfil cuando la pantalla se enfoca
  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [])
  );

  const handleSignOut = async () => {
    AppAlert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)');
            } catch (error: any) {
              const msg = mapSupabaseErrorMessage(error?.message);
              AppAlert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  const handleSettings = () => {
    // Abrir modal de configuraciones
    setSettingsModalVisible(true);
  };

  const handleEditProfile = () => {
    // Abrir modal de edición
    setEditModalVisible(true);
  };

  const handleProfileUpdated = (updatedProfile: CitizenProfile) => {
    // Actualizar el estado con el perfil actualizado
    setProfile(updatedProfile);
  };

  // Obtener iniciales del usuario para el avatar
  const getUserInitials = () => {
    if (profile?.nombre && profile?.apellido) {
      return `${profile.nombre.charAt(0)}${profile.apellido.charAt(0)}`.toUpperCase();
    }
    if (profile?.nombre) {
      return profile.nombre.substring(0, 2).toUpperCase();
    }
    const email = user?.email || '';
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  };

  // Obtener nombre completo
  const getFullName = () => {
    if (profile?.nombre && profile?.apellido) {
      return `${profile.nombre} ${profile.apellido}`;
    }
    if (profile?.nombre) {
      return profile.nombre;
    }
    return user?.email?.split('@')[0] || 'Usuario';
  };

  // Mostrar loading mientras carga el perfil
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: containerBg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={iconColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 } // Tab bar height + margen
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ProfileHeader ahora es parte del scroll con botones */}
        <View style={styles.headerWrapper}>
          <ProfileHeader 
            userName={getFullName()}
            userEmail={profile?.email || user?.email || 'correo@ejemplo.com'}
            userPhone={profile?.telefono || 'Sin teléfono'}
            userInitials={getUserInitials()}
            onEditPress={handleEditProfile}
          />
          
          {/* Botón de cerrar sesión en la esquina superior izquierda */}
          <TouchableOpacity 
            style={[
              styles.signOutButton, 
              { 
                backgroundColor: logoutButtonBg,
                top: insets.top + 12,
                left: Math.max(16, insets.left + 8),
              }
            ]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <IconSymbol name="exit-to-app" size={26} color={logoutIconColor} />
          </TouchableOpacity>

          {/* Botón de configuración en la esquina superior derecha */}
          <TouchableOpacity 
            style={[
              styles.settingsButton, 
              { 
                backgroundColor: settingsButtonBg,
                top: insets.top + 12,
                right: Math.max(16, insets.right + 8),
              }
            ]}
            onPress={handleSettings}
            activeOpacity={0.7}
          >
            <IconSymbol name="settings" size={26} color={settingsIconColor} />
          </TouchableOpacity>
        </View>
        
        {/* Espaciador para compensar el ProfileHeader */}
        <View style={styles.headerSpacer} />
        
        {/* Lista de denuncias del usuario */}
        <ReportsList />
      </ScrollView>

      {/* Modal de edición de perfil */}
      <EditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        profile={profile}
        onProfileUpdated={handleProfileUpdated}
      />

      {/* Modal de configuraciones */}
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  signOutButton: {
    position: 'absolute',
    left: 16, // Será sobreescrito dinámicamente con área segura
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  settingsButton: {
    position: 'absolute',
    right: 16, // Será sobreescrito dinámicamente con área segura
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
    height: Math.min(350, height * 0.35), // Sincronizado con ProfileHeader
    minHeight: 280,
    position: 'relative',
  },
  headerSpacer: {
    height: 20, // Espacio entre el header y la lista
  },
});
