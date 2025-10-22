import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, useColorScheme, useWindowDimensions } from 'react-native';
import BaseAuthLayout from '../components/BaseAuthLayout';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';


export default function WelcomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const responsive = useResponsiveLayout({ currentStep: 0, keyboardVisible: false, keyboardHeight: 0 });
  
  // Cálculos para botones
  const cardPadding = Math.max(24, Math.round(0.03 * height));
  const buttonW = 0.84 * width - cardPadding * 2;
  const buttonH = Math.max(56, Math.min(70, 0.07 * height));

  // Animación simple y estable
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  // Solo animación inicial muy sutil
  React.useEffect(() => {
    fadeAnim.setValue(0.95);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  // Asegurar visibilidad cuando regresa
  useFocusEffect(
    React.useCallback(() => {
      fadeAnim.setValue(1);
    }, [])
  );

  const handleNavigation = (route: string) => {
    // Navegación directa sin animaciones problemáticas
    router.push(route as any);
  };

  const scheme = useColorScheme();
  const logoShift = scheme === 'dark' ? 12 : 0;

  return (
    <BaseAuthLayout title="Bienvenido" showLogo={true} logoSize={responsive.widthCategory === 'compact' ? 0.72 : 0.60} logoShift={logoShift}>
      <Animated.View 
        style={[
          styles.buttonGroup,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity
          style={[styles.pillButton, { height: buttonH, width: buttonW, backgroundColor: '#0A4A90' }]}
          onPress={() => handleNavigation('/(auth)/signIn')}
          activeOpacity={0.8}
        >
          <Text allowFontScaling={false} style={[styles.pillButtonText, { fontSize: responsive.fontSize ? responsive.fontSize(18) : Math.max(18, Math.min(20, 0.024 * height)) } ]}>Iniciar sesión</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.pillButton,
            { height: buttonH, width: buttonW, backgroundColor: '#0A4A90' }
          ]}
          onPress={() => handleNavigation('/(auth)/signUp')}
          activeOpacity={0.8}
        >
          <Text allowFontScaling={false} style={[styles.pillButtonText, { fontSize: responsive.fontSize ? responsive.fontSize(18) : Math.max(18, Math.min(20, 0.024 * height)) } ]}>Registrarse</Text>
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
    // fontSize dinámico inyectado inline desde el componente para usar useWindowDimensions
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