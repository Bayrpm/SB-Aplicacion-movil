import { Image } from "expo-image";
import React from "react";
import { StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native'; // import { View } from 'react-native-reanimated/lib/typescript/Animated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/app/features/auth';
import { mapSupabaseErrorMessage } from '@/app/features/auth/api/auth.api';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { useRouter } from 'expo-router';

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
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? "light";
  const logoSource =
    scheme === "dark"
      ? require("@/assets/images/img_logo_blanco.png")
      : require("@/assets/images/img_logo.png");

  const LOGO_HEIGHT = 120; 
  const headerWrapperHeight =
    LOGO_HEIGHT + Math.max(24, Math.round(insets.top * 0.8)) + 24;

  return ( //return de HomeScreen()
    <ParallaxScrollView
      // fondo pantalla principal
      headerBackgroundColor={{ light: '#ffffff', dark: '#000000ff' }}
      headerHeight={headerWrapperHeight}
      headerImage={
        <View
          style={{
            height: headerWrapperHeight,
            justifyContent: "flex-start",
            alignItems: "center",
            paddingTop: Math.max(48, Math.round(insets.top * 1.2)),
            paddingBottom: 24,
          }}
        >
          <Image
            source={logoSource}
            style={[styles.logo, { height: LOGO_HEIGHT, marginTop: 12 }]}
            contentFit="contain"
          />
        </View>

      } //cierre de header image
    > {/*cierre de  ParallaxScrollView */}
      


      


      {/* BIENVENIDA E INICIO DE SESION */}
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

    // propio
logo: {
    width: 260,
    height: 120,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 12,
  },

container: {
    gap: 8,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
  },
});

