import { Knewave_400Regular, useFonts } from '@expo-google-fonts/knewave';
import * as SplashScreenExpo from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  // Cargar Knewave de Google Fonts
  let [fontsLoaded] = useFonts({
    Knewave_400Regular,
  });

  // Mantener la splash screen nativa hasta que las fuentes se carguen
  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreenExpo.hideAsync();
    }
  }, [fontsLoaded]);

  // Parámetros de textos con tamaño responsivo
  const safeTop = height * 0.06;           // zona segura superior
  const marginX = width * 0.08;            // márgenes laterales para textos
  const maxTextWidth = width - 2 * marginX; // ancho disponible para texto
  
  // "Bienvenido" - tamaño como h1 con Knewave (responsivo pero grande)
  let titleFont = height * 0.065;          // Tamaño base grande (6.5% del alto)
  const titleBaseline = height * 0.17;     // 17% del alto
  
  // Reducir solo si es absolutamente necesario (límite más amplio: ≤ 95% del ancho)
  const maxAllowedWidth = width * 0.95;
  const estimatedTextWidth = titleFont * 6; // "Bienvenido" estimación más conservadora
  if (estimatedTextWidth > maxAllowedWidth) {
    titleFont = Math.max(height * 0.15, maxAllowedWidth / 6); // Mínimo 15% del alto
  }
  
  const titleTop = Math.max(safeTop, titleBaseline - titleFont * 0.6);

  // Elipse rotada (-28°) parámetros normalizados - SOLO para el borde del azul
  const Cx = -0.45 * width;
  const Cy = 0.58 * height;
  const Rx = 1.55 * width;
  const Ry = 0.52 * height * 1.1; // 10% más pronunciada
  const phi = (-28 * Math.PI) / 180;
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);

  // Función para obtener puntos de la elipse
  const pointOnEllipse = (theta: number) => {
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const x = Cx + cosP * (Rx * ct) - sinP * (Ry * st);
    const y = Cy + sinP * (Rx * ct) + cosP * (Ry * st);
    return { x, y };
  };

  // Generar arco más preciso para curva "panzuda" 
  // (Eliminado: generación de puntos para arco poligonal, ahora usamos SVG 'A')
  // Path del bloque azul superior CORRECTO - cerrado desde esquinas
  const azulSuperiorPath = () => {
    // Usar comando SVG 'A' para arco elíptico exacto
    // M 0 0 → L W 0 → L W 0.40H → A Rx Ry rotación 0,0 0 0.60H → L 0 0 → Z
  const x1 = width;
  const y1 = height * 0.28 * 0.735; 
  const x2 = 0;
  const y2 = height * 0.66 * 0.735; 
  const rx = 1.55 * width;
  const ry = 0.42 * height * 1.1;
  const rotation = -28; // grados
  let d = `M 0 0`;
  d += ` L ${width} 0`;
  d += ` L ${x1} ${y1}`;
  d += ` A ${rx} ${ry} ${rotation} 0 1 ${x2} ${y2}`;
  d += ` L 0 0`;
  d += ` Z`;
  return d;
  };

  // Posición del texto inferior (Comencemos) - centro óptico del trapezoide
  const txtH = 0.05 * height; // un poco más grande para 'Comencemos'
  const centerY = 0.855 * height; // centro óptico del trapezoide
  const bottomTextTop = centerY - txtH * 0.5; // centrado exacto

  // Animación de opacidad para el texto 'Comencemos'
  const fadeAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      {/* Azul superior recortado por el arco elíptico */}
      <Svg style={styles.topSection} width={width} height={height}>
        <Path d={azulSuperiorPath()} fill="#6FB0DF" />
      </Svg>
      
      {/* Texto Bienvenido sobre el azul (solo cuando las fuentes estén listas) */}
      {fontsLoaded && (
        <Text style={[styles.bienvenidoText, { top: titleTop, fontSize: titleFont, paddingHorizontal: marginX }]}>
          Bienvenido
        </Text>
      )}
      {/* 1. Foto "delh" en su propia capa intermedia */}
      <Image 
        source={require('@/assets/images/delh.jpg')} 
        style={styles.photoLayer} 
        resizeMode="cover" 
      />
  <Svg style={styles.bottomBand} width={width + 2} height={height}><Path d={`M 0 ${height * (0.76 + (1-0.76)*0.2)} L ${width + 1} ${height * (0.68 + (1-0.68)*0.2)} L ${width + 1} ${height} L 0 ${height} Z`} fill="#0A4A90" /></Svg>
      {fontsLoaded && (
        <Animated.Text
          style={[
            styles.comencemosText,
            { top: bottomTextTop, fontSize: txtH, opacity: fadeAnim },
          ]}
        >
          Comencemos
        </Animated.Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  // Sección superior - Azul claro recortado por elipse
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2, // encima de la foto (zIndex 1)
  },
  // Texto "Bienvenido" - Knewave como h1
  bienvenidoText: {
    position: 'absolute',
    fontWeight: '400', // peso normal para Knewave
    letterSpacing: width * 0.002, // responsivo: 0.2% del ancho
    color: '#FFFFFF',
    textAlign: 'center',
    zIndex: 4, // encima del azul
    // Google Font: Knewave (estilo h1)
    fontFamily: 'Knewave_400Regular',
    width: '100%',
    // Sin sombra, sin contorno, sin itálica adicional
  },
  // Foto "delh" en capa intermedia - posicionada para mostrar cielo bajo la curva
  photoLayer: {
    position: 'absolute',
    top: height * 0.40, // responsivo: 40% del alto
    left: 0,
    right: 0,
    width: '100%',
    height: height * 0.41, // responsivo: 41% del alto
    zIndex: 1, // capa intermedia
  },
  // Banda inferior trapezoidal
  bottomBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3, // encima de la foto y del azul superior
  },
  // Texto "Comencemos" - Sans-serif redondeada y amable
  comencemosText: {
    position: 'absolute',
    fontWeight: 'bold', // Bold para redondez
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: width * 0.0006, // responsivo: 0.06% del ancho
    paddingLeft: width * 0.3, // 30% más a la derecha (8% * 1.2 = 9.6% del ancho)
    // Sans serif redondeada: Nunito Bold (ideal por redondez)
    fontFamily: Platform.OS === 'ios' ? 'Nunito-Bold' : Platform.OS === 'android' ? 'Nunito-Bold' : 'Quicksand-Bold',
    zIndex: 5, // encima de todo
    width: '100%',
  },
});

export default SplashScreen;