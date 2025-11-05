import { uploadCitizenAvatar } from '@/app/features/profileCitizen/api/profile.api';
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Dimensions, Image as RNImage, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
// Usamos un View plano en lugar de un SVG curvo para mantener la forma previa

const { width, height } = Dimensions.get('window');

interface ProfileHeaderProps {
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userInitials?: string;
  avatarUrl?: string | null;
  onAvatarUpdated?: (updatedProfile: any) => void;
  backgroundColor?: string;
  onSettingsPress?: () => void;
  onEditPress?: () => void;
}

export default function ProfileHeader({
  userName,
  userEmail,
  userPhone,
  userInitials = 'US',
  avatarUrl = null,
  onAvatarUpdated,
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

  // Altura del header más adaptable y limitada (aumentada para más espacio de curva)
  const maxHeaderHeight = Math.min(500, height * 0.45);
   const headerHeight = Math.round(Math.max(280, Math.min(420, height * 0.45))); // Altura del header adaptable: proporcional a la pantalla pero con límites
   // razonables para que en pantallas pequeñas no ocupe demasiado espacio y en
   // pantallas grandes permita la curva deseada.

  const ry = Math.max(Math.round(headerHeight * 1.1), Math.round(height * 0.38));
  // Calculamos un offset (bellyOffset) que representa cuanto baja la panza
  const bellyOffset = Math.round(ry * 0.7);
  // yEdge es la altura en la que empiezan los extremos de la curva (a ambos lados)
  const yEdge = Math.max(8, headerHeight - Math.round(bellyOffset * 0.6));
  const rx = width;
  const rotation = 0;
  const headerCurvePath = () => {
    // Dibujar arco elíptico desde la derecha hasta la izquierda en y = yEdge
    const d = `M 0 0 L ${width} 0 L ${width} ${yEdge} A ${rx} ${ry} ${rotation} 0 1 0 ${yEdge} L 0 0 Z`;
    return d;
  };

  // calcular la posición vertical ideal del botón Editar: queremos que el centro
  // del botón quede aproximadamente sobre el borde inferior del header (mitad
  // dentro/mitad fuera). Usamos `headerHeight` como referencia y añadimos un
  // pequeño empuje hacia abajo proporcional a la "panza" (bellyOffset) para que
  // visualmente quede bien en la mayoría de dispositivos.

  // Constantes del botón (usar constantes para mantener la altura/anchura
  // sincronizadas entre el cálculo y el estilo). Cambia aquí si quieres probar
  // variantes: ambos valores se usarán para calcular la posición y el render.
  const BUTTON_WIDTH = 120;
  const BUTTON_HEIGHT = 50;
  
  // Calcular dónde está el punto más bajo de la curva (la panza):
  // Para un arco elíptico, el punto más bajo está aproximadamente en:
  // yEdge + (ry - sqrt(ry^2 - rx^2)) pero simplificamos usando bellyOffset
  // Ajustamos el factor para que el botón quede exactamente en la panza
  const curveBottomY = yEdge + Math.round(bellyOffset * 0.18);
  
  // Posición ideal: centrar el botón en el punto más bajo de la curva
  // para que quede mitad dentro/mitad fuera de la panza en todos los dispositivos
  const desiredTop = curveBottomY - Math.round(BUTTON_HEIGHT / 2);
  // clamp por safe area y límite inferior razonable
  const minTop = insets.top + 8;
  const maxTop = headerHeight + Math.round(bellyOffset * 0.45);
  const editButtonTop = Math.max(minTop, Math.min(desiredTop, maxTop));

  return (
    // Permitimos que las áreas transparentes del header no bloqueen toques
    // hacia elementos que queden debajo en la lista. Usamos `box-none` para
    // que los hijos sigan recibiendo eventos normalmente.
    <View pointerEvents="box-none" style={[styles.headerContainer, { height: headerHeight }]}> 
      {/* Curva azul superior con área segura. No debe capturar toques sobre la lista. */}
      <Svg pointerEvents="none" style={styles.topSection} width={width} height={Math.round(headerHeight + bellyOffset + 12)}>
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
        {/* Avatar circular: mostrar imagen si existe, sino iniciales */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            AppAlert.alert('Cambiar foto', '¿Seguro que quieres cambiar tu foto de perfil?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Sí, cambiar', onPress: async () => {
                try {
                  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (!perm.granted) { AppAlert.alert('Avatar', 'Permiso denegado para acceder a la galería'); return; }
                  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
                  if (r.canceled || !r.assets?.length) return;
                  const uri = r.assets[0].uri;
                  const { data, error } = await uploadCitizenAvatar(uri);
                  if (error || !data) { AppAlert.alert('Error', error || 'No se pudo subir la imagen'); return; }
                  AppAlert.alert('Éxito', 'Avatar actualizado correctamente');
                  try { onAvatarUpdated && onAvatarUpdated(data); } catch {}
                } catch (e) {
                  AppAlert.alert('Error', 'No se pudo cambiar la foto de perfil');
                }
              } }
            ]);
          }}
          style={[styles.avatarContainer, { backgroundColor: avatarBg }]}
        >
          {avatarUrl ? (
            <RNImage source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, { fontSize: getFontSizeValue(fontSize, 32) }]}>{userInitials}</Text>
          )}
          {/* pequeño icono superpuesto */}
          <View style={styles.avatarOverlayBtn} pointerEvents="none">
            <IconSymbol name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

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
        <View style={[styles.infoContainer, { paddingBottom: Math.round(BUTTON_HEIGHT * 0.7) + 8 }]}>
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
            // Alinear el centro del botón Editar aproximadamente sobre la panza,
            // pero usar la posición calculada y limitada para evitar que caiga en mitad de la pantalla
            top: editButtonTop,
            left: Math.max((width - BUTTON_WIDTH) / 2, insets.left + 8), // Centrado horizontalmente con área segura
            width: BUTTON_WIDTH,
            height: BUTTON_HEIGHT,
            borderRadius: Math.round(BUTTON_HEIGHT / 2),
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
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    resizeMode: 'cover',
  },
  avatarOverlayBtn: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0A4A90',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 6,
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
