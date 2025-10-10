import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import BaseAuthLayout from '../components/BaseAuthLayout';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  
  // Cálculos para botones
  const cardPadding = Math.max(24, Math.round(0.03 * height));
  const buttonW = 0.84 * width - cardPadding * 2;
  const buttonH = Math.max(56, Math.min(70, 0.07 * height));

  // Animación simple
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Animación más simple y rápida
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Resetear animación cuando vuelves a esta pantalla
  useFocusEffect(
    React.useCallback(() => {
      // Restaurar opacidad completa de los botones
      fadeAnim.setValue(1);
    }, [fadeAnim])
  );

  const handleNavigation = (route: string) => {
    // Animación suave y cómoda para botones
    Animated.timing(fadeAnim, {
      toValue: 0.7,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      // Navegación después de la animación suave
      router.push(route as any);
    });
  };

  return (
    <BaseAuthLayout title="Bienvenido" showLogo={true}>
      <Animated.View 
        style={[
          styles.buttonGroup,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity
          style={[styles.pillButton, { height: buttonH, width: buttonW }]}
          onPress={() => handleNavigation('/(auth)/signIn')}
          activeOpacity={0.8}
        >
          <Text style={styles.pillButtonText}>Iniciar sesión</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pillButton, { height: buttonH, width: buttonW }]}
          onPress={() => handleNavigation('/(auth)/signUp')}
          activeOpacity={0.8}
        >
          <Text style={styles.pillButtonText}>Registrarse</Text>
        </TouchableOpacity>
      </Animated.View>
    </BaseAuthLayout>
  );
}

const styles = StyleSheet.create({
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
  },
  pillButton: {
    backgroundColor: '#0A4A90',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  pillButtonText: {
    color: '#FFFFFF',
    fontSize: Math.max(18, Math.min(20, 0.024 * height)),
    fontWeight: '700',
    letterSpacing: 0.3,
    fontFamily:
      Platform.OS === 'ios'
        ? 'Nunito-Bold'
        : Platform.OS === 'android'
        ? 'Nunito-Bold'
        : 'Quicksand-Bold',
  },
});