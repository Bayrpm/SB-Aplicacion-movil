import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProfileHeader from '@/app/features/profileCitizen/components/profileHeader';

import { useAuth } from '@/app/features/auth';
import { mapSupabaseErrorMessage } from '@/app/features/auth/api/auth.api';
import { getInspectorProfile, type InspectorProfile } from '@/app/features/profileInspector/api/inspectorProfile.api';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

import TurnCardContainer from '@/app/features/profileInspector/components/turnCardComponent';

const { height } = Dimensions.get('window');



export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const containerBg = useThemeColor({ light: '#F5F5F5', dark: '#000000' }, 'background');
  const actionButtonBg = useThemeColor({ light: '#FFFFFF', dark: '#071229' }, 'background');
  const logoutIconColor = '#FF5050'; // Rojo siempre
  const settingsIconColor = colorScheme === 'dark' ? '#FFFFFF' : '#4B5563';
  const spinnerColor = useThemeColor({ light: '#0A4A90', dark: '#FFFFFF' }, 'tint');

  const [profile, setProfile] = React.useState<InspectorProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const fetchProfile = async () => {
        setLoading(true);
        try {
          const { data, error } = await getInspectorProfile();
          if (!isActive) return;

          if (error) {
            AppAlert.alert('Error', error);
          }

          setProfile(data);
        } catch (error) {
          if (!isActive) return;
          console.error('Error inesperado al obtener perfil del inspector:', error);
          AppAlert.alert('Error', 'No se pudo cargar el perfil del inspector');
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      fetchProfile();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const displayName = React.useMemo(() => {
    const nombre = profile?.perfil?.nombre?.trim() ?? '';
    const apellido = profile?.perfil?.apellido?.trim() ?? '';
    const fullName = `${nombre} ${apellido}`.trim();

    if (fullName.length > 0) {
      return fullName;
    }

    if (user?.email) {
      return user.email.split('@')[0];
    }

    return 'Inspector';
  }, [profile, user]);

  const displayInitials = React.useMemo(() => {
    const nombre = profile?.perfil?.nombre?.trim();
    const apellido = profile?.perfil?.apellido?.trim();

    if (nombre && apellido) {
      return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
    }

    if (nombre) {
      return nombre.substring(0, 2).toUpperCase();
    }

    const fallback = user?.email?.split('@')[0] ?? 'IN';
    return fallback.substring(0, 2).toUpperCase();
  }, [profile, user]);

  const displayEmail = profile?.perfil?.email ?? user?.email ?? 'Sin correo disponible';
  const displayPhone = profile?.perfil?.telefono ?? 'Sin teléfono registrado';
  const avatarUrl = profile?.perfil?.avatar_url ?? null;

  const handleSignOut = () => {
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

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: containerBg,
            paddingTop: insets.top,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ActivityIndicator size="large" color={spinnerColor} />
      </View>
    );
  }

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
            userName={displayName}
            userEmail={displayEmail}
            userPhone={displayPhone}
            userInitials={displayInitials}
            avatarUrl={avatarUrl}
          />

          {/* Botón Cerrar sesión */}
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
            onPress={handleSignOut}
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
            onPress={() => { }}
          >
            <IconSymbol name="settings" size={28} color={settingsIconColor} />
          </TouchableOpacity>
        </View>

        {/* Espacio entre header y contenido */}
        <View style={styles.headerSpacer} />

        {/* Informacion card turnos */}
        <View style={styles.container}>
          <TurnCardContainer
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
