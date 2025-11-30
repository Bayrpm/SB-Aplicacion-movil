import { useThemeColor } from '@/hooks/use-theme-color';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
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
  contentCentered?: boolean; // si el contenido se centra verticalmente dentro de la card (default true)
  cardHeight?: number;
  cardTop?: number;
  cardBottomPx?: number;
  cardWidth?: number;
  cardPadding?: number;
  hideBottomBand?: boolean; // oculta la banda inferior azul
  logoShift?: number; // desplazamiento vertical extra del logo en px (opcional)
  titleTop?: number; // posición personalizada del título
  clipOverflow?: boolean; // cuando true aplica overflow: 'hidden' en la card para recortar contenido
}

export default function BaseAuthLayout({
  children,
  title = "Bienvenido",
  showLogo = true,
  logoSize = 0.60,
  logoInContent = false,
  contentCentered = true,
  cardHeight = 0.44,
  cardTop = 0.30,
  cardBottomPx,
  cardWidth = 0.84,
  cardPadding = 0.03,
  hideBottomBand = false,
  logoShift,
  titleTop,
  clipOverflow = false,
}: BaseAuthLayoutProps) {
    const [storyLoaded] = useStoryScript({ StoryScript_400Regular });
  const [appScheme] = useAppColorScheme();
  const scheme = appScheme ?? 'light';
  // Llamar a los hooks en orden constante: obtener valores por defecto desde useThemeColor
  // y luego aplicar overrides para modo oscuro. Esto evita cambiar el número/orden de hooks
  // al alternar el esquema de color en caliente.
  const defaultBackground = useThemeColor({}, 'background');
  const defaultTopFill = useThemeColor({ light: '#6FB0DF', dark: '#072F4A' }, 'tint');
  const defaultBottomFill = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint');

  // Fondo y card: en modo oscuro el fondo debe ser negro y la card un gris oscuro
  // Fondo general negro en dark, blanco en light
  const containerBg = scheme === 'dark' ? '#000' : '#fff';
  // Card también oscura en dark
  const cardBg = scheme === 'dark' ? '#111418' : '#fff';
  const topFill = defaultTopFill;
  const bottomFill = defaultBottomFill;
  
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


  // Detectar si el hijo es RegistrationStep3 (debe ir antes de los estilos que la usan)
  const isStep3 = React.Children.toArray(children).some(
    (child: any) => child?.type?.name === 'RegistrationStep3'
  );

  // No forzar layout especial para Step3, mantener centrado vertical
  const cardStyleStep3 = {};
  const contentStyleStep3 = {};

  // Cálculos para el logo - dinámico basado en logoSize
  // Increase logo size in dark mode slightly but clamp to avoid giant logos
  const baseLogoScale = scheme === 'dark' ? 1.15 : 1;
  // When logo is inside content (logoInContent) we should be conservative
  const contentLogoScale = logoInContent ? Math.min(baseLogoScale, 1.05) : baseLogoScale;
  const logoScale = contentLogoScale;
  // Compute logo dimensions but clamp to reasonable max values relative to card
  const rawLogoW = showLogo ? logoSize * cardW * logoScale : 0;
  const maxLogoW = Math.round(cardW * 0.6);
  const logoW = Math.min(rawLogoW, maxLogoW);
  const rawLogoH = showLogo ? (logoSize * 0.20) * cardH * logoScale : 0; // Proporcional al logoSize
  const maxLogoH = Math.round(cardH * 0.25);
  const logoH = Math.min(rawLogoH, maxLogoH);
  const logoShiftY = showLogo ? (typeof logoShift === 'number' ? logoShift : 0) : 0;

  // logo swap: use white logo in dark mode for better contrast
  const logoSource = scheme === 'dark'
    ? require('@/assets/images/img_logo_blanco.png')
    : require('@/assets/images/img_logo.png');

  return (
  <View style={[styles.container, { backgroundColor: containerBg }]}>
      {/* Curva azul superior */}
      <Svg style={styles.topSection} width={width} height={height}>
        <Path d={azulSuperiorPath()} fill={topFill} />
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
          allowFontScaling={false}
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
            borderRadius: cardRadius,
            padding: cardPaddingPx,
            backgroundColor: cardBg,
            ...(typeof cardBottomPx === 'number' ? { bottom: cardBottomPx } : { top: cardTopPx }),
            ...(clipOverflow ? { overflow: 'hidden' } : { overflow: 'visible' }),
          },
        ]}
      >
        {/* Logo (si showLogo es true y no está en el contenido) */}
        {showLogo && !logoInContent && (
          <View style={[styles.logoContainer, { transform: [{ translateY: logoShiftY }] }]}>
            <Image
              source={logoSource}
              style={[styles.logo, { width: logoW, height: logoH }]}
              contentFit="contain"
            />
          </View>
        )}
        
        {/* Contenido específico de cada pantalla */}
        {/* Si el logo está dentro del contenido (logoInContent), alineamos el contenido al inicio
            y permitimos overflow para que los inputs no queden cortados en pantallas pequeñas. */}
        <View
          style={[
            styles.contentContainer,
            (logoInContent ? styles.contentWithLogoInContent : {}),
            contentCentered
              ? { flex: (showLogo && !logoInContent) ? 0.85 : 1, marginTop: (showLogo && logoInContent) ? -10 : 0, alignItems: 'center', justifyContent: 'center' }
              : { flex: 1, alignItems: 'stretch', justifyContent: 'flex-start', marginTop: (showLogo && logoInContent) ? -10 : 0 },
          ]}
        >
          {logoInContent && showLogo && (
            <View style={[styles.logoInContentContainer, { marginBottom: 2 }]}> 
              <Image
                source={logoSource}
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
            fill={bottomFill}
          />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 2,
    overflow: 'visible',
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
    overflow: 'visible', // Permitimos overflow para que ScrollView y inputs no queden recortados
  },
  logoInContentContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 20,
    marginTop: -10,
  },
  contentWithLogoInContent: {
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
});
