import { deleteCitizenAvatar, uploadCitizenAvatar } from '@/app/features/profileCitizen/api/profile.api';
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
  /** Si es false, se ocultan las acciones de editar/avtar */
  showActions?: boolean;
  onHeightChange?: (height: number) => void;
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
  showActions = true,
  onHeightChange,
}: ProfileHeaderProps) {
  const { fontSize } = useFontSize();
  const insets = useSafeAreaInsets();
  const avatarBg = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint'); // Avatar siempre azul
  const defaultTopFill = useThemeColor({ light: '#6FB0DF', dark: '#072F4A' }, 'tint');
  const topFill = backgroundColor || defaultTopFill;
  const buttonBg = useThemeColor({ light: '#FFFFFF', dark: '#071229' }, 'background'); // Blanco en light, #071229 en dark
  const buttonBorderColor = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint'); // Borde azul siempre
  const buttonContentColor = useThemeColor({ light: '#0A4A90', dark: '#FFFFFF' }, 'tint'); // Azul en light, blanco en dark


  // Hacemos el SVG más alto en pantallas grandes y adaptativo hasta un máximo
  const SVG_HEIGHT = Math.round(Math.min(360, height * 0.40)); // altura base del área SVG (dp)
  const MIN_SVG_HEIGHT = 350; // mínimo absoluto requerido por diseño (usuario solicitó 340)
  const BUTTON_WIDTH = 120;
  const BUTTON_HEIGHT = 50;
  const RENDER_SVG_HEIGHT = Math.max(SVG_HEIGHT, MIN_SVG_HEIGHT);
  const [svgLayout, setSvgLayout] = React.useState({ x: 0, y: 0, width: width, height: RENDER_SVG_HEIGHT });
  const headerRef = React.useRef<View | null>(null);
  const svgRef = React.useRef<View | null>(null);
  const [buttonTopState, setButtonTopState] = React.useState<number | null>(null);
  const [contentTopState, setContentTopState] = React.useState<number | null>(null);
  const contentRef = React.useRef<View | null>(null);
  const [contentHeight, setContentHeight] = React.useState<number>(0);
  // Ajustamos la altura total del header para que no haya huecos grandes
  // ni espacio sobrante: dejamos suficiente espacio para el SVG y la mitad
  // del botón "Editar" que queda fuera del SVG. Incluimos el safe-area top
  // para que las mediciones y posicionamientos sean consistentes.
  // La altura real del header dependerá de la medida del SVG en runtime.
  const AVATAR_SIZE = Math.min(120, Math.round(width * 0.28));
  // Proporción vertical del fondo de la curva dentro del viewBox (coincide con headerCurvePath)
  const CURVE_BOTTOM_RATIO = 0.65;
  // curveBottomPx representa la posición (en píxeles) del punto inferior de la curva
  // calculada a partir de la altura medida del SVG y la proporción usada en el path.
  const curveBottomPx = Math.round((Math.max(svgLayout.height || 0, MIN_SVG_HEIGHT) || RENDER_SVG_HEIGHT) * CURVE_BOTTOM_RATIO); // CURVE_BOTTOM_RATIO
  // Centramos el contenido (avatar/info) entre el inicio del header y el borde de la curva
  // El área útil es desde la parte superior del header (0) hasta curveBottomPx
  const usableTop = 0;
  const usableHeight = curveBottomPx - usableTop;
  // Posición base para centrar el avatar dentro del área usable
  const baseContentTop = Math.max(0, usableTop + Math.round((usableHeight - AVATAR_SIZE) / 2));
  // Ajuste para evitar que el contenido sea tapado por el botón: medimos contentHeight y forzamos
  // que su fondo esté al menos `safeGap` px por encima de la mitad inferior del botón.
  // Aumentado para reducir solapamientos; se puede ajustar según resultados en dispositivo.
  const safeGap = 20;
  const maxContentTop = Math.max(0, curveBottomPx - Math.round(BUTTON_HEIGHT / 2) - contentHeight - safeGap);
  let contentTop = Math.min(baseContentTop, maxContentTop);
  // Evitar que el contenido suba por encima del header: forzamos un mínimo
  const MIN_CONTENT_TOP = 8;
  if (contentTop < MIN_CONTENT_TOP) contentTop = MIN_CONTENT_TOP;
  // El header debe cubrir hasta la base del botón (mitad fuera/mitad dentro)
  // Esta es la altura que debe usar el padre para evitar solapamientos
  const headerHeight = curveBottomPx + Math.round(BUTTON_HEIGHT / 2);


  const VIEWBOX_W = 100;
  // Incrementamos el viewBox vertical para permitir una curvatura más profunda
  const VIEWBOX_H = 55;
  const headerCurvePath = () => {
    // cubic bezier curve in relative viewBox coordinates
    return `M 0 0 L ${VIEWBOX_W} 0 L ${VIEWBOX_W} ${VIEWBOX_H * CURVE_BOTTOM_RATIO} C ${VIEWBOX_W * 0.78} ${VIEWBOX_H} ${VIEWBOX_W * 0.22} ${VIEWBOX_H} 0 ${VIEWBOX_H * CURVE_BOTTOM_RATIO} L 0 0 Z`;
  };




  // Cuando svgLayout cambia, medimos posiciones en ventana para calcular top absoluto relativo al header
  React.useEffect(() => {
    // medimos header y svg en pantalla solo para logging; no usamos la medida
    // para posicionar el botón final (evita resultados inconsistentes entre
    // dispositivos cuando measureInWindow devuelve offsets negativos).
    const measure = async () => {
      try {
        // @ts-ignore: native measureInWindow exists on HostComponent
        const headerMeasure = headerRef.current ? await new Promise<number[]>((res) => (headerRef.current as any).measureInWindow((x: number, y: number, w: number, h: number) => res([x, y, w, h]))) : null;
        // @ts-ignore
        const svgMeasure = svgRef.current ? await new Promise<number[]>((res) => (svgRef.current as any).measureInWindow((x: number, y: number, w: number, h: number) => res([x, y, w, h]))) : null;
        if (headerMeasure && svgMeasure) {
          const pageYHeader = headerMeasure[1];
          const pageYSvg = svgMeasure[1];
          const topRelative = Math.round((pageYSvg - pageYHeader) + curveBottomPx - BUTTON_HEIGHT / 2);
          // diagnostic measurements available; no logging in production
        }
      } catch (e) {
        console.warn('measure error', e);
      }
    };
    const t = setTimeout(measure, 0);
    return () => clearTimeout(t);
  }, [svgLayout.height, curveBottomPx]);

  // Calculamos top del botón a partir de la altura efectiva del SVG (usando el mínimo)
  const effectiveSvgH = Math.max(svgLayout.height || RENDER_SVG_HEIGHT, MIN_SVG_HEIGHT);
  const computedButtonTop = Math.round((effectiveSvgH * CURVE_BOTTOM_RATIO) - Math.round(BUTTON_HEIGHT / 2));

  // Posicionar el botón para que quede mitad dentro/mitad fuera del SVG de forma determinista:
  // colocamos el centro del botón en la línea inferior del SVG: top = svgHeight - BUTTON_HEIGHT/2
  // Esto evita dependencias con insets y hace la posición independiente del contenido.
  const safetyOffset = 0; // px: pequeño ajuste si es necesario
  const svgHeightEffective = svgLayout.height && svgLayout.height > 0 ? svgLayout.height : RENDER_SVG_HEIGHT;
  // Posición fallback: centro del botón en la línea inferior del SVG (relativo al header)
  const computedButtonTopFallback = Math.round(svgHeightEffective - Math.round(BUTTON_HEIGHT / 2) + safetyOffset);

  // Cuando svgLayout.height cambie, actualizamos el state para forzar re-render y usar la medida real
  React.useEffect(() => {
    if (svgLayout.height && svgLayout.height > 0) {
      // Posicionar respecto al top del headerContainer (sin insets)
      const bt = Math.round(svgLayout.height - Math.round(BUTTON_HEIGHT / 0.8) + safetyOffset);
      setButtonTopState(bt);
    } else {
      setButtonTopState(null);
    }
  }, [svgLayout.height]);

  // Calcular la posición absoluta del contenido (avatar, nombre, email, telefono)
  // respecto al headerContainer para que queden dentro del área del SVG.
  React.useEffect(() => {
    // Compute content top relative to headerContainer and clamp to visible area.
    // Avoid negative tops that place the content above the header.
    const svgH = svgLayout.height && svgLayout.height > 0 ? svgLayout.height : RENDER_SVG_HEIGHT;
    const raw = Math.round(contentTop - svgH);
    // Ensure the content is at least below the top edge of the header
    const minTop = 28;
    const clamped = Math.max(raw, minTop);
    setContentTopState(clamped);
  
  }, [svgLayout.height, contentHeight, contentTop]);

  return (

  <View ref={headerRef} pointerEvents="box-none" style={[styles.headerContainer, { height: headerHeight }]}> 

      <View ref={svgRef} onLayout={(e) => {
        const l = e.nativeEvent.layout;
        // Guardamos la medida real del wrapper (height puede variar en algunos dispositivos)
        // aplicamos mínimo absoluto para evitar inconsistencias entre dispositivos
        const measured = Math.max(Math.round(l.height), MIN_SVG_HEIGHT);
        setSvgLayout({ x: l.x, y: l.y, width: l.width, height: measured });
        // Avisar al padre con la altura final del header (hasta el borde inferior del botón)
        try { onHeightChange && onHeightChange(Math.round((measured * CURVE_BOTTOM_RATIO) + (BUTTON_HEIGHT / 2))); } catch (e) { /* noop */ }
      }} style={[styles.topSection, { height: RENDER_SVG_HEIGHT, position: 'relative' }]}> 
        <Svg
          pointerEvents="none"
          width={width}
          height={RENDER_SVG_HEIGHT}
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          preserveAspectRatio="none"
        >
          <Path d={headerCurvePath()} fill={topFill} />
        </Svg>
      </View>

    {/* Botón Editar: hijo directo de headerContainer (posición absoluta respecto al header)
        para quedar mitad dentro y mitad fuera del SVG. top se calcula sumando insets.top
        porque el SVG está desplazado por el paddingTop del header. */}
  <View style={{ position: 'absolute', left: 0, right: 0, top: (buttonTopState ?? computedButtonTopFallback), alignItems: 'center', zIndex: 30 }} pointerEvents="box-none">
      {showActions && (
        <TouchableOpacity
          style={[
            styles.editButton,
            {
              backgroundColor: buttonBg,
              borderWidth: 2,
              borderColor: buttonBorderColor,
              width: BUTTON_WIDTH,
              height: BUTTON_HEIGHT,
              borderRadius: Math.round(BUTTON_HEIGHT / 2),
            },
          ]}
          onPress={onEditPress}
          activeOpacity={0.7}
        >
          <IconSymbol name="edit" size={20} color={buttonContentColor} />
          <Text style={[styles.editButtonText, { color: buttonContentColor, fontSize: getFontSizeValue(fontSize, 16) }]}>Editar</Text>
        </TouchableOpacity>
      )}
    </View>
      {/* Botón Editar: ahora hijo de headerContainer, posición absoluta respecto a la pantalla */}

      {/* Contenido del header dentro del área del SVG (posición absoluta) */}
      <View ref={contentRef} onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          if (h && h !== contentHeight) setContentHeight(h);
        }} style={[
        styles.contentContainer,
        {
          // Posicionamos el contenido absolutamente respecto al headerContainer
          // para que quede dentro del área del SVG. Usamos contentTopState cuando esté
          // disponible y fallback a una posición razonable.
          position: 'absolute',
          top: (contentTopState != null) ? contentTopState : (svgLayout.height ? Math.round(contentTop - svgLayout.height) : Math.round(-BUTTON_HEIGHT / 2)),
          left: 0,
          right: 0,
          paddingHorizontal: Math.max(20, insets.left + 8, insets.right + 8),
          zIndex: 2,
        }
      ]}>
        {/* Avatar circular: mostrar imagen si existe, sino iniciales */}
        {/* Avatar: ahora responsivo para pantallas pequeñas/grandes */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={async () => {
            if (!showActions) return;
            // Construir botones dinámicamente: Modificar, Eliminar (solo si hay avatar), Cancelar
            const buttons: any[] = [];

            buttons.push({
              text: 'Modificar',
              onPress: async () => {
                try {
                  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (!perm.granted) { AppAlert.alert('Avatar', 'Permiso denegado para acceder a la galería'); return; }
                  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
                  if (r.canceled || !r.assets?.length) return;
                  const uri = r.assets[0].uri;
                  const { data, error } = await uploadCitizenAvatar(uri);
                  if (error || !data) { AppAlert.alert('Error', error || 'No se pudo subir la imagen'); return; }
                  AppAlert.alert('Éxito', 'Avatar actualizado correctamente');
                  try { onAvatarUpdated && onAvatarUpdated(data); } catch (e) { console.warn('onAvatarUpdated error', e); }
                } catch (e) {
                  AppAlert.alert('Error', 'No se pudo cambiar la foto de perfil');
                }
              }
            });

            if (avatarUrl) {
              buttons.push({
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                  // Confirmación adicional
                  AppAlert.alert('Eliminar avatar', '¿Estás seguro? Esta acción quitará tu avatar.', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Sí, eliminar', style: 'destructive', onPress: async () => {
                        try {
                          const { data, error } = await deleteCitizenAvatar(avatarUrl);
                          if (error) {
                            console.error('deleteCitizenAvatar error:', error);
                            AppAlert.alert('Error', typeof error === 'string' ? error : String(error));
                            return;
                          }
                          AppAlert.alert('Avatar', 'Avatar eliminado correctamente');
                          try {
                            if (onAvatarUpdated) onAvatarUpdated(data ?? null);
                          } catch (cbErr) {
                            console.warn('onAvatarUpdated callback error:', cbErr);
                          }
                        } catch (e) {
                          console.error('Eliminar avatar exception:', e);
                          AppAlert.alert('Error', 'No se pudo eliminar avatar');
                        }
                      } }
                  ]);
                }
              });
            }

            // Siempre agregar la opción Cancelar al final (estilo cancel)
            buttons.push({ text: 'Cancelar', style: 'cancel' });

            AppAlert.alert('Avatar', '¿Qué quieres hacer con tu foto de perfil?', buttons);
          }}
          style={[
            styles.avatarContainer,
            {
              backgroundColor: avatarBg,
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: Math.round(AVATAR_SIZE / 2),
            }
          ]}
        >
            {avatarUrl ? (
              <RNImage source={{ uri: avatarUrl }} style={[styles.avatarImage, { width: '100%', height: '100%', borderRadius: Math.round(Math.min(120, Math.round(width * 0.28)) / 2) }]} />
            ) : (
              <Text style={[styles.avatarText, { fontSize: getFontSizeValue(fontSize, Math.max(28, Math.round(Math.min(120, Math.round(width * 0.28)) * 0.36))) }]}>{userInitials}</Text>
            )}
          {/* pequeño icono superpuesto */}
          {showActions && (
            <View style={styles.avatarOverlayBtn} pointerEvents="none">
              <IconSymbol name="camera" size={18} color="#fff" />
            </View>
          )}
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

    {/* Información de contacto - separamos del avatar/botón para evitar solapamientos */}
  <View style={[styles.infoContainer, { paddingBottom: 8, marginTop: 8 }]}>
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
    // Keep the SVG in normal flow so wrapper onLayout measures its height
    width: '100%',
    zIndex: 1,
  },
  contentContainer: {
    // Usamos posicionamiento en flujo y un marginTop negativo para solapar
    // el contenido con la curva del SVG de forma consistente entre dispositivos.
    position: 'relative',
    alignItems: 'center',
    zIndex: 2,
    paddingHorizontal: 20, // Será sobreescrito dinámicamente
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
    fontSize: 44,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: 'cover',
  },
  avatarOverlayBtn: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 36,
    height: 36,
    borderRadius: 18,
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
    // usamos posicionamiento en flujo + marginTop negativo para solapar la curva
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
