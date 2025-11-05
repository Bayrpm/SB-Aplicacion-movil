import { listEvidencesSigned } from '@/app/features/report/api/evidences.api';
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
// expo-av will be imported dynamically at runtime to avoid native-module require on startup
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image, Linking, Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CitizenReport, getCategoryById, getCitizenProfile, getEstadoById } from '../api/profile.api';

interface ReportDetailModalProps {
  visible: boolean;
  onClose: () => void;
  report: CitizenReport | null;
  onToggleLike?: () => void;
  isLiked?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Formatea la fecha en formato completo: "12 de noviembre, 2025 - 14:30 hrs" */
function getFullDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day} de ${month}, ${year} - ${hours}:${minutes} hrs`;
}

/** Mapea categorías a iconos (mismo set que en ReportCard) */
function getCategoryIcon(categoryId?: number | null): string {
  const ICON_MAP: Record<number, string> = {
    1: 'ambulance',
    2: 'alert-circle-outline',
    3: 'shield-alert',
    4: 'pill',
    5: 'pistol',
    6: 'bell-ring-outline',
    7: 'police-badge',
    8: 'dots-horizontal',
  };
  if (categoryId && ICON_MAP[categoryId]) return ICON_MAP[categoryId];
  return 'map-marker';
}

export default function ReportDetailModal({
  visible,
  onClose,
  report,
  onToggleLike,
  isLiked = false,
}: ReportDetailModalProps) {
  try { console.warn('ReportDetailModal: render -> visible=', visible, ' reportId=', report?.id); } catch {}
  const insets = useSafeAreaInsets();
  const { fontSize } = useFontSize();
  const bgColor = useThemeColor({ light: '#FFFFFF', dark: '#071229' }, 'background'); // Color específico para cards
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint'); // Azul siempre
  const mutedColor = useThemeColor({}, 'icon');
  const borderColor = mutedColor + '26';
  const buttonBg = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint'); // Botones azules
  const buttonText = '#FFFFFF'; // Texto blanco en botones

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [resolvedCategoryName, setResolvedCategoryName] = useState<string | null>(null);
  const [resolvedEstadoName, setResolvedEstadoName] = useState<string | null>(null);
  const [resolvedCitizen, setResolvedCitizen] = useState<{
    nombre: string | null;
    apellido: string | null;
    email: string | null;
    telefono: string | null;
  } | null>(null);
  const [evidences, setEvidences] = useState<Array<{ tipo: 'FOTO'|'VIDEO'; url: string; storage_path: string }>>([]);
  const [VideoModule, setVideoModule] = useState<any>(null);

  // Cargar evidencias (firmadas) al abrir el modal
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (visible && report?.id) {
          const ev = await listEvidencesSigned(report.id);
          if (active) setEvidences(ev);
        } else {
          setEvidences([]);
        }
      } catch (e) {
        try { console.warn('reportDetailModal: fallo al cargar evidencias:', e); } catch {}
      }
    })();
    return () => { active = false; };
  }, [visible, report?.id]);

  // Intentar cargar expo-av de forma dinámica para evitar crash cuando el módulo nativo
  // no está disponible en el entorno (Expo Go vs Dev Client). Si falla, dejamos fallback.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Importar el nuevo paquete `expo-video` (reemplazo de expo-av)
        const mod = await import('expo-video');
        // Normalizar la API para que el resto del componente pueda usar VideoModule.Video y VideoModule.ResizeMode
  const m: any = mod;
  const VideoComp = (m && (m.Video || m.default)) ?? null;
  const ResizeMode = m?.ResizeMode ?? (m?.Video?.ResizeMode) ?? null;
  if (mounted) setVideoModule({ Video: VideoComp, ResizeMode });
      } catch (e) {
        // No disponible: no hacemos nada, usaremos fallback (abrir URL externa)
        try { console.warn('reportDetailModal: fallo al importar expo-video:', e); } catch {}
        
      }
    })();
    return () => { mounted = false; };
  }, []);
  // Resolver nombre de categoría si no vino por join (debe ejecutarse siempre en el mismo orden)
  React.useEffect(() => {
    let mounted = true;
    const id = report?.categoria_publica_id;
    if (!report || report.categoria?.nombre || !id) {
      return () => { mounted = false; };
    }
    getCategoryById(id).then((res) => {
      if (!mounted) return;
      if (res?.data?.nombre) setResolvedCategoryName(res.data.nombre);
    });
    return () => {
      mounted = false;
    };
  }, [report?.categoria?.nombre, report?.categoria_publica_id]);

  // Resolver nombre de estado si no vino por join
  React.useEffect(() => {
    let mounted = true;
    const id = report?.estado_id;
    if (!report || report.estado?.nombre || !id) {
      return () => { mounted = false; };
    }
    getEstadoById(id).then((res) => {
      if (!mounted) return;
      if (res?.data?.nombre) setResolvedEstadoName(res.data.nombre);
    });
    return () => {
      mounted = false;
    };
  }, [report?.estado?.nombre, report?.estado_id]);

  // Resolver datos del ciudadano si no vino el join y la denuncia no es anónima (orden estable)
  React.useEffect(() => {
    let mounted = true;
    const isAnonymous = !!report?.anonimo;
    if (!isAnonymous && report && !report.ciudadano) {
      getCitizenProfile().then((res) => {
        if (!mounted || !res?.data) return;
        const { nombre, apellido, email, telefono } = res.data;
        setResolvedCitizen({ nombre, apellido, email, telefono });
      });
    }
    return () => {
      mounted = false;
    };
  }, [report?.anonimo, report?.ciudadano]);

  // Si el modal debe mostrarse pero el `report` todavía no está cargado,
  // mostramos un Modal minimal con spinner para evitar no-render cuando
  // `visible` es true pero `report` es null (caso race condition).
  if (visible && !report) {
    return (
      <Modal visible animationType="none" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={{ marginTop: 12, color: textColor }}>Cargando detalle...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!report) return null;

  const fullDateTime = getFullDateTime(report.fecha_creacion);
  const folio = report.folio != null ? String(report.folio) : `#${report.id.slice(0, 8).toUpperCase()}`;
  const hasImages = report.imagenes_url && report.imagenes_url.length > 0;
  const isAnonymous = report.anonimo;
  const categoryIcon = getCategoryIcon(report.categoria_publica_id);
  const categoryName = report.categoria?.nombre ?? resolvedCategoryName ?? (report.categoria_publica_id ? `Categoría ${report.categoria_publica_id}` : 'Sin categoría');
  const estadoName = report.estado?.nombre ?? resolvedEstadoName ?? 'Pendiente';

  // Datos del ciudadano
  const user = !isAnonymous ? (report.ciudadano || resolvedCitizen) : null;
  const userName = isAnonymous
    ? 'Denuncia Anónima'
    : user
    ? `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Usuario'
    : 'Usuario';
  const userEmail = !isAnonymous && (user?.email ?? null);
  const userPhone = !isAnonymous && (user?.telefono ?? null);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.folio, { color: '#6FB0DF', fontSize: getFontSizeValue(fontSize, 20) }]}>Folio: {folio}</Text>
                <View style={styles.categoryRow}>
                  <IconSymbol name={categoryIcon} size={24} color={textColor} />
                  <Text style={[styles.category, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                    {categoryName}
                  </Text>
                </View>
                {/* Mostrar badge de anónimo o datos del usuario */}
                {isAnonymous ? (
                  <View style={[styles.anonymousBadge, { backgroundColor: accentColor, borderWidth: 1, borderColor: accentColor }]}>
                    <IconSymbol name="user-secret" size={16} color="#FFFFFF" />
                    <Text style={[styles.anonymousText, { color: '#FFFFFF', fontSize: getFontSizeValue(fontSize, 12) }]}>
                      Denuncia Anónima
                    </Text>
                  </View>
                ) : (
                  <View style={styles.userInfoHeader}>
                    <IconSymbol name="account" size={20} color={textColor} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.userNameHeader, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                        {userName}
                      </Text>
                      {userEmail && (
                        <Text style={[styles.userDetailHeader, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]} numberOfLines={1}>
                          {userEmail}
                        </Text>
                      )}
                      {userPhone && (
                        <Text style={[styles.userDetailHeader, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>
                          {userPhone}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Título */}
              <Text style={[styles.title, { color: textColor, fontSize: getFontSizeValue(fontSize, 22) }]}>{report.titulo}</Text>

              {/* Estado con etiqueta */}
              <View style={styles.statusRow}>
                <Text style={[styles.labelText, { color: textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>Estado:</Text>
                <View style={[styles.statusBadge, { backgroundColor: accentColor }]}>
                  <Text style={[styles.statusText, { color: '#FFFFFF', fontSize: getFontSizeValue(fontSize, 13) }]}>
                    {estadoName}
                  </Text>
                </View>
              </View>

              {/* Fecha y hora */}
              <View style={styles.infoRow}>
                <IconSymbol name="calendar" size={18} color={mutedColor} />
                <Text style={[styles.infoText, { color: textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>{fullDateTime}</Text>
              </View>

              {/* Ubicación */}
              {report.ubicacion_texto && (
                <View style={styles.infoRow}>
                  <IconSymbol name="location-pin" size={18} color={mutedColor} />
                  <Text style={[styles.infoText, { color: textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>
                    {report.ubicacion_texto}
                  </Text>
                </View>
              )}

              {/* Descripción */}
              {report.descripcion && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                    Descripción
                  </Text>
                  <Text style={[styles.description, { color: textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>
                    {report.descripcion}
                  </Text>
                </View>
              )}

              {/* Imágenes */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>                
                  Evidencias
                </Text>

                {evidences.length > 0 ? (
                  <>
                    {/* Fotos */}
                    <View style={styles.imageGrid}>
                      {evidences.filter(e => e.tipo === 'FOTO').map((ev, index) => (
                        <TouchableOpacity
                          key={ev.storage_path}
                          onPress={() => setSelectedImageIndex(index)}
                          activeOpacity={0.8}
                        >
                          <Image source={{ uri: ev.url }} style={styles.thumbnail} />
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Videos */}
                    {evidences.some(e => e.tipo === 'VIDEO') && (
                      <View style={{ marginTop: 12, gap: 12 }}>
                        {evidences.filter(e => e.tipo === 'VIDEO').map((ev) => (
                          <View key={ev.storage_path} style={{ width: '100%' }}>
                            {VideoModule?.Video ? (
                              <VideoModule.Video
                                source={{ uri: ev.url }}
                                style={{ width: '100%', height: 220, backgroundColor: '#00000020', borderRadius: 12 }}
                                useNativeControls
                                resizeMode={VideoModule?.ResizeMode?.CONTAIN}
                                shouldPlay={false}
                              />
                            ) : (
                              <TouchableOpacity
                                onPress={() => { try { Linking.openURL(ev.url); } catch { /* ignore */ } }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }}
                              >
                                <IconSymbol name="play-circle" size={22} color={accentColor} />
                                <Text style={{ color: textColor }}>Ver video</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.noFilesBox}>
                    <Image
                      source={require('../../../../assets/images/icon.png')}
                      style={styles.noFilesImage}
                    />
                    <Text style={[styles.noFilesText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 14) }]}>                      
                      No hay archivos, fotos o videos
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Footer con botones */}
            <View
              style={[
                styles.footer,
                { borderTopColor: borderColor, paddingBottom: 16 + insets.bottom, paddingTop: 16 },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.likeButton, 
                  { 
                    borderColor: accentColor,
                    backgroundColor: 'transparent' 
                  }
                ]}
                onPress={onToggleLike}
                activeOpacity={0.7}
              >
                <IconSymbol
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isLiked ? accentColor : mutedColor}
                />
                <Text
                  style={[
                    styles.likeCount,
                    { color: isLiked ? accentColor : mutedColor, fontSize: getFontSizeValue(fontSize, 16) },
                  ]}
                >
                  {report.likes_count || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.backButton, { backgroundColor: buttonBg }]}
                onPress={onClose}
              >
                <Text style={[styles.backButtonText, { color: buttonText, fontSize: getFontSizeValue(fontSize, 16) }]}>Volver</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de galería de imágenes */}
      {selectedImageIndex !== null && evidences.filter(e=>e.tipo==='FOTO').length > 0 && selectedImageIndex < evidences.filter(e=>e.tipo==='FOTO').length && (
        <Modal
          visible
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedImageIndex(null)}
        >
          <View style={styles.galleryOverlay}>
            <TouchableOpacity
              style={styles.galleryClose}
              onPress={() => setSelectedImageIndex(null)}
            >
              <IconSymbol name="close" size={32} color="#fff" />
            </TouchableOpacity>
            <Image
              source={{ uri: evidences.filter(e=>e.tipo==='FOTO')[selectedImageIndex]?.url || '' }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <View style={styles.galleryIndicator}>
              <Text style={[styles.galleryIndicatorText, { fontSize: getFontSizeValue(fontSize, 14) }]}>
                {selectedImageIndex + 1} / {evidences.filter(e=>e.tipo==='FOTO').length}
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    height: '90%',
    display: 'flex',
    flexDirection: 'column',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  folio: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  anonymousBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  anonymousText: {
    fontSize: 12,
    fontWeight: '700',
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  userNameHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  userDetailHeader: {
    fontSize: 12,
    lineHeight: 16,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  labelText: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 10,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  thumbnail: {
    width: (SCREEN_WIDTH - 60) / 3,
    height: (SCREEN_WIDTH - 60) / 3,
    borderRadius: 12,
    backgroundColor: '#00000010',
  },
  noFilesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  noFilesImage: {
    width: 64,
    height: 64,
    opacity: 0.6,
  },
  noFilesText: {
    fontSize: 14,
    fontWeight: '600',
  },
  userSection: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  userDetail: {
    fontSize: 14,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 0,
    borderTopWidth: 1,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  likeCount: {
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  galleryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: '80%',
  },
  galleryIndicator: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  galleryIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
