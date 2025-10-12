import { StoryScript_400Regular, useFonts as useStoryScript } from '@expo-google-fonts/story-script';
import { Image } from 'expo-image';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface BaseAuthLayoutProps {
  children: React.ReactNode;
  title?: string; // título personalizable (default "Bienvenido")
  showLogo?: boolean; // mostrar logo o no (default true)
  logoSize?: number; // tamaño del logo dinámico (default 0.60)
  logoInContent?: boolean; // si el logo va dentro del contenido scrollable
  cardHeight?: number;
  cardTop?: number;
  cardWidth?: number;
  cardPadding?: number;
  hideBottomBand?: boolean; // oculta la banda inferior azul
  titleTop?: number; // posición personalizada del título
}

export default function BaseAuthLayout({
  children,
  title = "Bienvenido",
  showLogo = true,
  logoSize = 0.60,
  logoInContent = false,
  cardHeight = 0.44,
  cardTop = 0.30,
  cardWidth = 0.84,
  cardPadding = 0.03,
  hideBottomBand = false,
  titleTop,
}: BaseAuthLayoutProps) {
  const [storyLoaded] = useStoryScript({ StoryScript_400Regular });
  
  // Cálculos para el título
  const marginX = width * 0.08;
  const titleBoxH = 0.085 * height;
  let titleFontSize = titleBoxH;
  const maxTextWidth = width * 0.84;
  const estimatedWidth = (len: number, fs: number) => len * fs * 0.62;
  if (estimatedWidth(title.length, titleFontSize) > maxTextWidth) {
    titleFontSize = maxTextWidth / (title.length * 0.62);
  }
  const baseline = 0.17 * height;
  const calculatedTitleTop = Math.max(height * 0.06, (baseline - titleFontSize * 0.8) + 0.040 * height);
  const finalTitleTop = titleTop !== undefined ? titleTop * height : calculatedTitleTop;

  // Curva superior
  const azulSuperiorPath = () => {
    const x1 = width;
    const yEdge = height * 0.4;
    const y1 = yEdge;
    const x2 = 0;
    const y2 = yEdge;
    const rx = 1.0 * width;
    const ry = 0.45 * height;
    const rotation = 0;
    let d = `M 0 0`;
    d += ` L ${width} 0`;
    d += ` L ${x1} ${y1}`;
    d += ` A ${rx} ${ry} ${rotation} 0 1 ${x2} ${y2}`;
    d += ` L 0 0`;
    d += ` Z`;
    return d;
  };

  // Tarjeta blanca centrada
  const cardW = cardWidth * width;
  const cardH = cardHeight * height;
  const cardTopPx = cardTop * height;
  const cardRadius = Math.max(18, Math.round(0.05 * width));
  const cardPaddingPx = Math.max(24, Math.round(cardPadding * height));

  // Cálculos para el logo - dinámico basado en logoSize
  const logoW = showLogo ? logoSize * cardW : 0;
  const logoH = showLogo ? (logoSize * 0.20) * cardH : 0; // Proporcional al logoSize
  const logoShiftY = showLogo ? 0 : 0;

  return (
    <View style={styles.container}>
      {/* Curva azul superior */}
      <Svg style={styles.topSection} width={width} height={height}>
        <Path d={azulSuperiorPath()} fill="#6FB0DF" />
      </Svg>

      {/* Título "Bienvenido" */}
      {storyLoaded && (
        <Text
          style={[
            styles.titleText,
            {
              top: finalTitleTop,
              fontSize: titleFontSize,
              paddingHorizontal: marginX,
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}

      {/* Tarjeta blanca centrada */}
      <View
        style={[
          styles.card,
          {
            width: cardW,
            height: cardH,
            top: cardTopPx,
            borderRadius: cardRadius,
            padding: cardPaddingPx,
          },
        ]}
      >
        {/* Logo (si showLogo es true y no está en el contenido) */}
        {showLogo && !logoInContent && (
          <View style={[styles.logoContainer, { transform: [{ translateY: logoShiftY }] }]}>
            <Image
              source={require('@/assets/images/img_logo.png')}
              style={[styles.logo, { width: logoW, height: logoH }]}
              contentFit="contain"
            />
          </View>
        )}
        
        {/* Contenido específico de cada pantalla */}
        <View style={[styles.contentContainer, { flex: (showLogo && !logoInContent) ? 0.85 : 1, marginTop: (showLogo && !logoInContent) ? -30 : 0 }]}>
          {logoInContent && showLogo && (
            <View style={[styles.logoInContentContainer]}>
              <Image
                source={require('@/assets/images/img_logo.png')}
                style={[styles.logo, { width: logoW, height: logoH }]}
                contentFit="contain"
              />
            </View>
          )}
          {children}
        </View>
      </View>

      {/* Banda inferior trapezoidal (opcional) */}
      {!hideBottomBand && (
        <Svg style={styles.bottomBand} width={width + 2} height={height}>
          <Path
            d={`M 0 ${height * (0.86 + (1 - 0.86) * 0.2)} L ${width + 1} ${height * (0.78 + (1 - 0.78) * 0.2)} L ${width + 1} ${height} L 0 ${height} Z`}
            fill="#0A4A90"
          />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  titleText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'StoryScript_400Regular',
    letterSpacing: -width * 0.0002,
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 3,
  },
  card: {
    position: 'absolute',
    left: (width - 0.84 * width) / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 2,
    overflow: 'visible', // Permitir que el ScrollView funcione correctamente
  },
  bottomBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  logoContainer: {
    flex: 0.15,
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    paddingBottom: 0,
  },
  logo: {
    // dimensiones dinámicas pasadas como props
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // Asegurar que el contenido animado no se sobreponga al logo
  },
  logoInContentContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 20,
    marginTop: -10,
  },
});