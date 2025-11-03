// app/features/report/components/reportDetailModal.tsx
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { Alert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
    PanResponder,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { getRelativeTime } from '../../profileCitizen/utils/timeFormat';
import { fetchPublicReportDetail } from '../api/report.api';

interface ReportDetail {
  id: string;
  folio: string;
  titulo: string;
  descripcion: string;
  categoria_publica_id: number;
  coords_x: number;
  coords_y: number;
  fecha_creacion: string;
  ubicacion_texto: string | null;
  anonimo: boolean;
  ciudadano?: {
    nombre?: string;
    apellido?: string;
  };
  // TODO: agregar campos de evidencia cuando estén disponibles
}

interface NearbyReport {
  id: string;
  titulo: string;
  fecha_creacion: string;
  categoria_publica_id: number | null;
  distancia_metros: number;
}

interface ReportDetailModalProps {
  visible: boolean;
  reportId: string | null;
  reportIds?: string[]; // array de IDs para grupos
  onClose: () => void;
}

export default function ReportDetailModal({
  visible,
  reportId,
  reportIds,
  onClose,
}: ReportDetailModalProps) {
  const { fontSize } = useFontSize();
  const bgColor = useThemeColor({ light: '#FFFFFF', dark: '#071229' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'icon');
  const accentColor = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint');
  const itemBg = useThemeColor({ light: '#F9FAFB', dark: '#0A1628' }, 'background');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F2937' }, 'icon');

  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<ReportDetail[]>([]); // cambio: array de reportes
  const [nearbyReports, setNearbyReports] = useState<NearbyReport[]>([]);
  const [reportStats, setReportStats] = useState<Record<string, {
    likes: number;
    dislikes: number;
    hasLiked: boolean;
    hasDisliked: boolean;
    commentsCount: number;
  }>>({});
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedReportForComments, setSelectedReportForComments] = useState<string | null>(null);
  const [translateY] = useState(new Animated.Value(0));

  // PanResponder para detectar el gesto de deslizar hacia abajo
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_: any, gestureState: any) => {
      return Math.abs(gestureState.dy) > 5; // Activar si hay movimiento significativo
    },
    onPanResponderMove: (_: any, gestureState: any) => {
      if (gestureState.dy > 0) {
        // Solo permitir deslizar hacia abajo
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_: any, gestureState: any) => {
      const threshold = 150; // Umbral para cerrar (aumentado a 150px)
      const velocity = gestureState.vy; // Velocidad del gesto
      
      // Cerrar si se desliza más del umbral O si tiene velocidad alta hacia abajo
      if (gestureState.dy > threshold || (gestureState.dy > 50 && velocity > 0.5)) {
        // Continuar la animación desde la posición actual hacia abajo
        Animated.timing(translateY, {
          toValue: 1000, // Deslizar completamente fuera de la pantalla
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setCommentsModalVisible(false);
        });
      } else {
        // Regresar a la posición original con animación suave
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  useEffect(() => {
    if (visible && (reportId || (reportIds && reportIds.length > 0))) {
      loadReportDetail();
    } else {
      // Reset state cuando se cierra
      setReports([]);
      setNearbyReports([]);
      setReportStats({});
      setCommentsModalVisible(false);
      setSelectedReportForComments(null);
    }
  }, [visible, reportId, reportIds]);

  // Reset translateY cuando se abre/cierra el modal de comentarios
  useEffect(() => {
    if (commentsModalVisible) {
      // Reset a 0 cuando se abre
      translateY.setValue(0);
    } else {
      // Asegurar que esté en 0 cuando está cerrado
      translateY.setValue(0);
    }
  }, [commentsModalVisible]);

  // Helper Haversine (metros)
  const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const loadReportDetail = async () => {
    setLoading(true);
    try {
      // Determinar qué IDs cargar
      const idsToLoad = reportIds && reportIds.length > 0 ? reportIds : (reportId ? [reportId] : []);
      
      if (idsToLoad.length === 0) {
        setLoading(false);
        return;
      }

      // Cargar todos los reportes del grupo
      const loadedReports: ReportDetail[] = [];
      for (const id of idsToLoad) {
        try {
          const detail = await fetchPublicReportDetail(id);
          loadedReports.push(detail as any);
        } catch (err) {
        }
      }

      setReports(loadedReports);

      // Inicializar stats para cada reporte
      const initialStats: Record<string, any> = {};
      loadedReports.forEach((report) => {
        // TODO: reemplazar con datos reales de la API
        initialStats[report.id] = {
          likes: 0,
          dislikes: 0,
          hasLiked: false,
          hasDisliked: false,
          commentsCount: 0,
        };
      });
      setReportStats(initialStats);

      // Ya no buscamos "cercanas" porque el grupo ya contiene todas las relevantes
      setNearbyReports([]);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };


  const handleLike = async (reportId: string) => {
    try {
      const currentStats = reportStats[reportId] || {
        likes: 0,
        dislikes: 0,
        hasLiked: false,
        hasDisliked: false,
        commentsCount: 0,
      };

      // Si ya tiene dislike, quitarlo primero
      let newDislikes = currentStats.dislikes;
      let newHasDisliked = currentStats.hasDisliked;
      if (currentStats.hasDisliked) {
        newHasDisliked = false;
        newDislikes = currentStats.dislikes - 1;
      }
      
      // Toggle like
      const newHasLiked = !currentStats.hasLiked;
      const newLikes = newHasLiked ? currentStats.likes + 1 : currentStats.likes - 1;

      setReportStats({
        ...reportStats,
        [reportId]: {
          ...currentStats,
          likes: newLikes,
          dislikes: newDislikes,
          hasLiked: newHasLiked,
          hasDisliked: newHasDisliked,
        },
      });
      // TODO: Implementar API call
    } catch (error) {
    }
  };

  const handleDislike = async (reportId: string) => {
    try {
      const currentStats = reportStats[reportId] || {
        likes: 0,
        dislikes: 0,
        hasLiked: false,
        hasDisliked: false,
        commentsCount: 0,
      };

      // Si ya tiene like, quitarlo primero
      let newLikes = currentStats.likes;
      let newHasLiked = currentStats.hasLiked;
      if (currentStats.hasLiked) {
        newHasLiked = false;
        newLikes = currentStats.likes - 1;
      }
      
      // Toggle dislike
      const newHasDisliked = !currentStats.hasDisliked;
      const newDislikes = newHasDisliked ? currentStats.dislikes + 1 : currentStats.dislikes - 1;

      setReportStats({
        ...reportStats,
        [reportId]: {
          ...currentStats,
          likes: newLikes,
          dislikes: newDislikes,
          hasLiked: newHasLiked,
          hasDisliked: newHasDisliked,
        },
      });
      // TODO: Implementar API call
    } catch (error) {
    }
  };

  const handleShare = async (reportId: string) => {
    try {
      // Buscar el reporte específico
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      // Crear deep link para abrir la denuncia en la app
      const deepLink = `sbaplicacionmovil://report/${reportId}`;
      
      // Crear el mensaje para compartir
      const message = `🚨 Denuncia Ciudadana\n\n` +
        `📋 ${report.titulo}\n\n` +
        `${report.descripcion}\n\n` +
        `📍 ${report.ubicacion_texto || 'Ubicación no especificada'}\n\n` +
        `📅 ${formatDateTime(report.fecha_creacion)}\n\n` +
        `🔗 Ver en la app: ${deepLink}`;

      // Usar el Share API de React Native
      const result = await Share.share(
        {
          message: message,
          title: 'Compartir Denuncia',
        },
        {
          // Opciones para el diálogo de compartir
          dialogTitle: 'Compartir esta denuncia',
        }
      );

      if (result.action === Share.sharedAction) {
        // Se compartió exitosamente
        if (result.activityType) {
          // Compartido con una actividad específica (iOS)
        } else {
          // Compartido (Android o iOS sin actividad específica)
          Alert.alert('Éxito', 'Denuncia compartida correctamente');
        }
      } else if (result.action === Share.dismissedAction) {
        // El usuario canceló el compartir
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo compartir la denuncia. Intenta nuevamente.');
    }
  };

  const handleComments = (reportId: string) => {
    setSelectedReportForComments(reportId);
    setCommentsModalVisible(true);
  };

  // Helper para obtener iniciales (primeras letras del nombre y apellido)
  const getInitials = (nombre?: string, apellido?: string): string => {
    const firstInitial = nombre?.trim().charAt(0).toUpperCase() || '';
    const lastInitial = apellido?.trim().charAt(0).toUpperCase() || '';
    return firstInitial + lastInitial;
  };

  const formatDateTime = (dateString: string) => {
    try {
      const d = new Date(dateString);
      // Fecha y hora locales en español (Chile)
      const opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };
      return d.toLocaleString('es-CL', opts);
    } catch {
      return new Date(dateString).toLocaleString();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          {/* Header simple */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <Text style={[styles.headerTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 18) }]}>Detalle de Denuncia</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={[styles.loadingText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                Cargando...
              </Text>
            </View>
          ) : (
            <>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {/* Título del grupo si hay múltiples reportes */}
              {reports.length > 1 && (
                <View style={[styles.groupHeader, { backgroundColor: itemBg, borderColor }]}>
                  <IconSymbol name="layers" size={20} color={accentColor} />
                  <Text style={[styles.groupHeaderText, { color: bgColor === '#071229' ? '#FFFFFF' : accentColor, fontWeight: 'bold', fontSize: getFontSizeValue(fontSize, 16) }]}> 
                    {reports.length} denuncias agrupadas en la zona
                  </Text>
                </View>
              )}

              {/* Iterar sobre todos los reportes del grupo */}
              {reports.map((report, idx) => (
                <View key={report.id} style={styles.reportBlock}>
                  {/* Separador entre reportes (excepto el primero) */}
                  {idx > 0 && <View style={[styles.reportSeparator, { borderTopColor: borderColor }]} />}

                  {/* Información del usuario */}
                  <View style={[styles.section, { backgroundColor: itemBg }]}>
                    {report?.anonimo ? (
                      <View style={styles.anonymousBadge}>
                        <IconSymbol name="user-secret" size={20} color={mutedColor} />
                        <Text style={[styles.anonymousText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                          Usuario Anónimo
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.userInfo}>
                        <View style={[styles.userAvatar, { backgroundColor: accentColor }]}>
                          <Text style={styles.userAvatarText}>
                            {getInitials(report?.ciudadano?.nombre, report?.ciudadano?.apellido)}
                          </Text>
                        </View>
                        <View>
                          <Text style={[styles.userName, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                            {report?.ciudadano?.nombre || ''} {report?.ciudadano?.apellido || ''}
                          </Text>
                        </View>
                      </View>
                    )}
                    {/* Meta: fecha y hora + relativo */}
                    {report?.fecha_creacion && (
                      <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                          <IconSymbol name="clock" size={14} color={mutedColor} />
                          <Text style={[styles.metaText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]} numberOfLines={1}>
                            {formatDateTime(report.fecha_creacion)} · {getRelativeTime(report.fecha_creacion)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Título y descripción */}
                  <View style={styles.section}>
                    <Text style={[styles.title, { color: textColor, fontSize: getFontSizeValue(fontSize, 20) }]}>
                      {report?.titulo || 'Cargando...'}
                    </Text>
                    <Text style={[styles.description, { color: textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>
                      {report?.descripcion || ''}
                    </Text>
                  </View>

                  {/* Ubicación */}
                  {report?.ubicacion_texto && (
                    <View style={[styles.section, styles.locationSection]}>
                      <View style={styles.locationHeader}>
                        <IconSymbol name="location-pin" size={20} color={accentColor} />
                        <Text style={[styles.sectionTitle, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                          Ubicación
                        </Text>
                      </View>
                      <Text style={[styles.locationText, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                        {report.ubicacion_texto}
                      </Text>
                    </View>
                  )}

                  {/* Evidencia */}
                  <View style={[styles.section, styles.evidenceSection]}>
                    <View style={styles.evidenceHeader}>
                      <IconSymbol name="image" size={20} color={accentColor} />
                      <Text style={[styles.sectionTitle, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                        Evidencia
                      </Text>
                    </View>
                    {/* TODO: Mostrar imágenes/videos cuando estén disponibles */}
                    <Text style={[styles.noEvidenceText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 13) }]}>
                      Sin evidencia adjunta
                    </Text>
                  </View>

                  {/* Barra de acciones estilo Instagram - Individual para cada denuncia */}
                  <View style={[styles.instagramActions, { borderTopColor: borderColor }]}>
                    <View style={styles.instagramActionsLeft}>
                      <TouchableOpacity
                        onPress={() => handleLike(report.id)}
                        activeOpacity={0.7}
                        style={styles.instagramActionButton}
                      >
                        <IconSymbol
                          name={(reportStats[report.id]?.hasLiked) ? 'heart.fill' : 'heart'}
                          size={28}
                          color={(reportStats[report.id]?.hasLiked) ? '#EF4444' : textColor}
                        />
                        {(reportStats[report.id]?.likes || 0) > 0 && (
                          <Text style={[styles.actionCountText, { color: textColor, fontSize: getFontSizeValue(fontSize, 12) }]}>
                            {reportStats[report.id]?.likes}
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDislike(report.id)}
                        activeOpacity={0.7}
                        style={styles.instagramActionButton}
                      >
                        <IconSymbol
                          name={(reportStats[report.id]?.hasDisliked) ? 'hand.thumbsdown.fill' : 'hand.thumbsdown'}
                          size={26}
                          color={(reportStats[report.id]?.hasDisliked) ? '#EF4444' : textColor}
                        />
                        {(reportStats[report.id]?.dislikes || 0) > 0 && (
                          <Text style={[styles.actionCountText, { color: textColor, fontSize: getFontSizeValue(fontSize, 12) }]}>
                            {reportStats[report.id]?.dislikes}
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleComments(report.id)}
                        activeOpacity={0.7}
                        style={styles.instagramActionButton}
                      >
                        <IconSymbol
                          name="bubble.left"
                          size={26}
                          color={textColor}
                        />
                        {(reportStats[report.id]?.commentsCount || 0) > 0 && (
                          <Text style={[styles.actionCountText, { color: textColor, fontSize: getFontSizeValue(fontSize, 12) }]}>
                            {reportStats[report.id]?.commentsCount}
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleShare(report.id)}
                        activeOpacity={0.7}
                        style={styles.instagramActionButton}
                      >
                        <IconSymbol
                          name="paperplane"
                          size={26}
                          color={textColor}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Contador de likes/dislikes y comentarios */}
                  <View style={styles.instagramStats}>
                    {((reportStats[report.id]?.likes || 0) > 0 || (reportStats[report.id]?.dislikes || 0) > 0) && (
                      <Text style={[styles.instagramStatsText, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                        {(reportStats[report.id]?.likes || 0) > 0 && `${reportStats[report.id]?.likes} Me gusta`}
                        {(reportStats[report.id]?.likes || 0) > 0 && (reportStats[report.id]?.dislikes || 0) > 0 && ' · '}
                        {(reportStats[report.id]?.dislikes || 0) > 0 && `${reportStats[report.id]?.dislikes} No me gusta`}
                      </Text>
                    )}
                    {(reportStats[report.id]?.commentsCount || 0) > 0 && (
                      <TouchableOpacity onPress={() => handleComments(report.id)} activeOpacity={0.7}>
                        <Text style={[styles.instagramCommentsLink, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                          Ver los {reportStats[report.id]?.commentsCount} comentarios
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Footer con botón Volver */}
            <View style={[styles.footer, { borderTopColor: borderColor }]}>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                style={[styles.backButtonBottom, { backgroundColor: accentColor }]}
              >
                <Text style={[styles.backButtonBottomText, { color: '#FFFFFF', fontSize: getFontSizeValue(fontSize, 15) }]}>Volver</Text>
              </TouchableOpacity>
            </View>
            </>
          )}
        </View>

        {/* Modal de comentarios estilo Instagram */}
        <Modal
          visible={commentsModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setCommentsModalVisible(false)}
        >
          <View style={styles.commentsOverlay}>
            <Animated.View 
              style={[
                styles.commentsContainer, 
                { 
                  backgroundColor: bgColor,
                  transform: [{ translateY }]
                }
              ]}
            >
              {/* Barra superior con indicador deslizable */}
              <View style={styles.commentsHandle} {...panResponder.panHandlers}>
                <View style={[styles.commentsHandleBar, { backgroundColor: mutedColor }]} />
              </View>

              {/* Header de comentarios */}
              <View style={[styles.commentsHeader, { borderBottomColor: borderColor }]}>
                <Text style={[styles.commentsHeaderTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                  Comentarios
                </Text>
                <TouchableOpacity
                  onPress={() => setCommentsModalVisible(false)}
                  style={styles.commentsCloseButton}
                >
                  <IconSymbol name="xmark.circle.fill" size={24} color={mutedColor} />
                </TouchableOpacity>
              </View>

              {/* Contenido de comentarios */}
              <ScrollView style={styles.commentsContent} showsVerticalScrollIndicator={false}>
                <View style={styles.commentsEmpty}>
                  <IconSymbol name="bubble.left" size={48} color={mutedColor} />
                  <Text style={[styles.commentsEmptyText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                    Sin comentarios aún
                  </Text>
                  <Text style={[styles.commentsEmptySubtext, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                    Sé el primero en comentar
                  </Text>
                </View>
                {/* TODO: Implementar lista de comentarios */}
              </ScrollView>

              {/* Input de comentarios */}
              <View style={[styles.commentsInputContainer, { borderTopColor: borderColor }]}>
                <View style={[styles.commentsInput, { backgroundColor: itemBg, borderColor }]}>
                  <Text style={[styles.commentsInputPlaceholder, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                    Agregar un comentario...
                  </Text>
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </Modal>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButtonBottom: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonBottomText: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  anonymousBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  anonymousText: {
    fontSize: 14,
    fontWeight: '500',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  reportDate: {
    fontSize: 13,
    marginTop: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 28,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  locationSection: {
    gap: 8,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  evidenceSection: {
    gap: 8,
  },
  evidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noEvidenceText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nearbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  nearbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  nearbyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  nearbyItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  nearbyItemDistance: {
    fontSize: 12,
    fontWeight: '600',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  groupHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  reportBlock: {
    // Contenedor para cada reporte en un grupo
  },
  reportSeparator: {
    borderTopWidth: 2,
    marginVertical: 16,
    marginHorizontal: 20,
  },
  // Estilos estilo Instagram
  instagramActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  instagramActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  instagramActionButton: {
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  instagramStats: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 4,
  },
  instagramStatsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  instagramCommentsLink: {
    fontSize: 14,
    marginTop: 4,
  },
  // Estilos para modal de comentarios
  commentsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  commentsContainer: {
    height: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  commentsHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  commentsHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  commentsHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  commentsCloseButton: {
    padding: 4,
  },
  commentsContent: {
    flex: 1,
  },
  commentsEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  commentsEmptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  commentsEmptySubtext: {
    fontSize: 14,
  },
  commentsInputContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentsInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  commentsInputPlaceholder: {
    fontSize: 14,
  },
});
