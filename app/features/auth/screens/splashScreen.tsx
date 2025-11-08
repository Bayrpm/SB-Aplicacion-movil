// SplashScreen.tsx
import * as SplashScreenExpo from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import {
	Animated,
	Easing,
	Image,
	Platform,
	StatusBar,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// Fuentes
import { Knewave_400Regular, useFonts } from '@expo-google-fonts/knewave';
import { Nunito_700Bold } from '@expo-google-fonts/nunito';

SplashScreenExpo.preventAutoHideAsync().catch(() => {});

const SplashScreen = () => {
  const [fontsLoaded] = useFonts({
    Knewave_400Regular,
    Nunito_700Bold,
  });

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Alto útil sin status/barra inferior
  const H = Math.max(0, height - insets.top - insets.bottom);

  // Proporciones (ajustadas al mock)
  const TOP_WAVE_H = H * 0.50;
  const PHOTO_H = H * 0.42;
  const BOTTOM_BAND_H = H * 0.16;

  // Posicionamiento relativo
  const photoTop = insets.top + TOP_WAVE_H - H * 0.02; // leve solape
  const bottomBandBottom = insets.bottom; // anclado al borde inferior

  // Tipografías proporcionales
  const base = Math.min(width, H);
  const titleFont = base * 0.18;   // “Bienvenido”
  const ctaFont = base * 0.11;     // “Comencemos”

  // Animaciones
  const titleAnim = useRef(new Animated.Value(0)).current;
  const bottomPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!fontsLoaded) return;

    Animated.sequence([
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(50),
    ]).start(() => {
      SplashScreenExpo.hideAsync().catch(() => {});
      Animated.loop(
        Animated.sequence([
          Animated.timing(bottomPulse, {
            toValue: 0.4,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bottomPulse, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    return () => {
      titleAnim.stopAnimation();
      bottomPulse.stopAnimation();
    };
  }, [fontsLoaded]);

  return (
    <View style={[styles.container]}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
      <View style={{ height: insets.top }} />

      {/* Ola superior: izquierda más baja, derecha más alta */}
      <Svg
        width={width}
        height={TOP_WAVE_H}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={styles.absoluteTop}
        pointerEvents="none"
      >
        {/* Derecha (y≈60) arriba; izquierda (y≈90) abajo */}
        <Path d="M0,0 H100 V60 Q52 100 0 95 Z" fill="#6FB0DF" />
      </Svg>

      {/* Título */}
      {fontsLoaded && (
        <Animated.Text
          accessibilityRole="header"
          style={[
            styles.bienvenidoText,
            {
              top: insets.top + TOP_WAVE_H * 0.28,
              fontSize: titleFont,
              opacity: titleAnim,
              transform: [
                {
                  translateY: titleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
            },
          ]}
        >
          Bienvenido
        </Animated.Text>
      )}

      {/* Foto central */}
      <Image
        source={require('@/assets/images/delh.jpg')}
        style={{
          position: 'absolute',
          top: photoTop,
          width,
          height: PHOTO_H,
        }}
        resizeMode="cover"
      />

      {/* Banda inferior inclinada */}
      <Svg
        width={width}
        height={BOTTOM_BAND_H}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: bottomBandBottom }}
        pointerEvents="none"
      >
        <Path d="M0,18 L100,0 L100,100 L0,100 Z" fill="#0A4A90" />
      </Svg>

      {/* CTA */}
      {fontsLoaded && (
        <Animated.Text
          style={[
            styles.comencemosText,
            {
              fontSize: ctaFont,
              opacity: bottomPulse,
              bottom:
                bottomBandBottom +
                BOTTOM_BAND_H * 0.50 -
                ctaFont * 0.60,
              letterSpacing: Platform.select({ ios: 0.2, android: 0.4, default: 0.3 }),
            },
          ]}
        >
          Comencemos
        </Animated.Text>
      )}

      <View style={{ height: insets.bottom }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  absoluteTop: { position: 'absolute', left: 0, right: 0, top: 0 },
  bienvenidoText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: '#FFFFFF',
    zIndex: 2,
    fontFamily: 'Knewave_400Regular',
    fontWeight: '400',
  },
  comencemosText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'right',
    color: '#FFFFFF',
    zIndex: 3,
    fontFamily:
      Platform.OS === 'ios' || Platform.OS === 'android'
        ? 'Nunito_700Bold'
        : 'Nunito_700Bold',
    fontWeight: '700',
  },
});

export default SplashScreen;
