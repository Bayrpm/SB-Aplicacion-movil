import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface ProfileHeaderProps {
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userInitials?: string;
  backgroundColor?: string;
  onSettingsPress?: () => void;
  onEditPress?: () => void;
}

export default function ProfileHeader({
  userName,
  userEmail,
  userPhone,
  userInitials = 'US',
  backgroundColor,
  onSettingsPress,
  onEditPress,
}: ProfileHeaderProps) {
  const { fontSize } = useFontSize();
  const insets = useSafeAreaInsets();
  const avatarBg = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint'); // Avatar siempre azul
  const defaultTopFill = useThemeColor({ light: '#6FB0DF', dark: '#072F4A' }, 'tint');
  const topFill = backgroundColor || defaultTopFill;
  const buttonBg = useThemeColor({ light: '#FFFFFF', dark: '#071229' }, 'background'); // Blanco en light, #071229 en dark
  const buttonBorderColor = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint'); // Borde azul siempre
  const buttonContentColor = useThemeColor({ light: '#0A4A90', dark: '#FFFFFF' }, 'tint'); // Azul en light, blanco en dark

  // Altura del header más adaptable y limitada (máximo 350px o 35% de la altura)
  const maxHeaderHeight = Math.min(350, height * 0.35);
  const headerHeight = Math.max(280, maxHeaderHeight); // Mínimo 280px
  const curveDepth = 40; // Profundidad de la curva inferior reducida

  // Curva inferior del header con forma de onda suave
  const headerCurvePath = () => {
    const curveStartY = headerHeight - curveDepth;
    const controlPointOffset = curveDepth * 1.5;
    
    let d = `M 0 0`; // Inicio en esquina superior izquierda
    d += ` L ${width} 0`; // Línea al borde superior derecho
    d += ` L ${width} ${curveStartY}`; // Línea vertical hasta antes de la curva
    // Curva suave con bezier cuadrática
    d += ` Q ${width / 2} ${headerHeight + controlPointOffset} 0 ${curveStartY}`;
    d += ` L 0 0`; // Cierra en la esquina superior izquierda
    d += ` Z`;
    return d;
  };

  return (
    <View style={styles.headerContainer}>
      {/* Curva azul superior con área segura */}
      <Svg style={styles.topSection} width={width} height={headerHeight + curveDepth}>
        <Path d={headerCurvePath()} fill={topFill} />
      </Svg>

      {/* Contenido del header con márgenes seguros */}
      <View style={[
        styles.contentContainer, 
        { 
          top: insets.top + 20, // Espaciado más consistente
          paddingHorizontal: Math.max(20, insets.left + 8, insets.right + 8), // Área segura horizontal
        }
      ]}>
        {/* Avatar circular */}
        <View style={[styles.avatarContainer, { backgroundColor: avatarBg }]}>
          <Text style={[styles.avatarText, { fontSize: getFontSizeValue(fontSize, 32) }]}>{userInitials}</Text>
        </View>

        {/* Nombre del usuario */}
        {userName && (
          <Text 
            style={[styles.userName, { fontSize: getFontSizeValue(fontSize, 19) }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {userName}
          </Text>
        )}

        {/* Información de contacto - con padding bottom para no llegar al botón */}
        <View style={[styles.infoContainer, { paddingBottom: 35 }]}>
          {userPhone && (
            <View style={styles.infoRow}>
              <IconSymbol name="phone" size={20} color="#FFFFFF" />
              <Text 
                style={[styles.infoText, { fontSize: getFontSizeValue(fontSize, 14) }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {userPhone}
              </Text>
            </View>
          )}
          
          {userEmail && (
            <View style={styles.infoRow}>
              <IconSymbol name="email" size={20} color="#FFFFFF" />
              <Text 
                style={[styles.infoText, { fontSize: getFontSizeValue(fontSize, 14) }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {userEmail}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Botón Editar en el centro inferior (mitad dentro, mitad fuera) */}
      <TouchableOpacity 
        style={[
          styles.editButton, 
          { 
            backgroundColor: buttonBg,
            borderWidth: 2,
            borderColor: buttonBorderColor, // Borde azul
            top: headerHeight - 25, // Mitad del botón (50px / 2)
            left: Math.max(width / 2 - 60, insets.left + 8), // Área segura izquierda
          }
        ]}
        onPress={onEditPress}
        activeOpacity={0.7}
      >
        <IconSymbol name="edit" size={20} color={buttonContentColor} />
        <Text style={[styles.editButtonText, { color: buttonContentColor, fontSize: getFontSizeValue(fontSize, 16) }]}>Editar</Text>
      </TouchableOpacity>
    </View>
  );
}

// Función helper para escalar tamaños de fuente
function getFontSizeValue(fontSize: 'small' | 'medium' | 'large', base: number): number {
  switch (fontSize) {
    case 'small':
      return base * 0.85;
    case 'medium':
      return base;
    case 'large':
      return base * 1.25;
    default:
      return base;
  }
}

const styles = StyleSheet.create({
  headerContainer: {
    position: 'relative',
    width: '100%',
    height: Math.min(350, height * 0.35), // Altura máxima limitada
    minHeight: 280, // Altura mínima
    overflow: 'visible',
  },
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  contentContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
    paddingHorizontal: 20, // Será sobreescrito dinámicamente
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
    maxWidth: width * 0.85, // Limita el ancho para evitar sobreposición con botón de settings
  },
  infoContainer: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    maxWidth: width * 0.85, // Limita el ancho
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.95,
    flexShrink: 1, // Permite que el texto se reduzca si es necesario
  },
  editButton: {
    position: 'absolute',
    left: width / 2 - 60, // Centrado (120px de ancho / 2) - será ajustado dinámicamente
    width: 120,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
