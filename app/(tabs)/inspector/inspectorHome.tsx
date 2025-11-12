import { mapSupabaseErrorMessage } from '@/app/features/auth/api/auth.api';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { Image } from "expo-image";
import React from "react";

import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { useAuth } from '@/app/features/auth';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const { user, isInspector, inspectorLoading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {

  // no borrar model del cristobal
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

  return (
    <ParallaxScrollView
      // imagen de ReactNative
      headerBackgroundColor={{ light: '#b35f35ff', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="defaultSemiBold">¡Bienvenido!</ThemedText>
        {inspectorLoading || typeof isInspector === 'undefined' ? null : (
          <ThemedText>
            {isInspector ? 'Usuario Inspector autenticado' : 'Usuario Ciudadano autenticado'}: {user?.email}
          </ThemedText>
        )}
        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <ThemedText style={styles.buttonText}>Cerrar sesión</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  button: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

