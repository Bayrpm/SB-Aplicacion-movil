// app/features/report/components/reportDetailModal.tsx
import { listEvidencesSigned } from '@/app/features/report/api/evidences.api';
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import CommentsPanel from '@/components/commentsPanel';
import { Alert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  PanResponder,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCitizenProfile } from '../../profileCitizen/api/profile.api';
import { createReportComment, deleteReportComment, fetchPublicReportDetail, fetchReportComments, fetchReportStats, reactToComment, reactToReport, updateReportComment } from '../api/report.api';
// screen width used by gallery styles
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const insets = useSafeAreaInsets();
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
  const [comments, setComments] = useState<Array<any>>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [currentUserNombre, setCurrentUserNombre] = useState<string | null>(null);
  const [currentUserApellido, setCurrentUserApellido] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedReportForComments, setSelectedReportForComments] = useState<string | null>(null);
  // Evidences (images/videos) por reporte
  const [evidencesMap, setEvidencesMap] = useState<Record<string, Array<{ tipo: 'FOTO' | 'VIDEO'; url: string; storage_path: string }>>>({});
  const [loadingEvidencesMap, setLoadingEvidencesMap] = useState<Record<string, boolean>>({});
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedImageReport, setSelectedImageReport] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [VideoModule, setVideoModule] = useState<any>(null);
  const [videoImportError, setVideoImportError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState<boolean>(false);
  const [videoPlaybackError, setVideoPlaybackError] = useState<string | null>(null);
  // Video thumbnails (storage_path -> local uri)
  const [videoThumbs, setVideoThumbs] = useState<Record<string, string>>({});
  const [videoThumbsLoading, setVideoThumbsLoading] = useState<Record<string, boolean>>({});
  const [videoThumbsFailed, setVideoThumbsFailed] = useState<Record<string, boolean>>({});
  const [thumbModuleMissing, setThumbModuleMissing] = useState<boolean>(false);
  const [translateY] = useState(new Animated.Value(0));
  const buttonText = '#FFFFFF';
  const { width: SCREEN_WIDTH } = Dimensions.get('window');

  const InAppVideoRenderer = ({ uri }: { uri: string }) => {
    try {
      // Build a VideoSource object when possible to help the native player.
      // NOTE: expo-video native API expects specific types for some fields (eg. enums),
      // passing a plain string for `contentType` causes native cast errors on Android.
      // Keep the source minimal and avoid `contentType` to prevent bridge casting errors.
      const isMp4 = typeof uri === 'string' && /\.mp4(\?|$)/i.test(uri);
      const sourceObj: any = isMp4 ? { uri, overrideFileExtensionAndroid: 'mp4', useCaching: true } : { uri };

      // Prefer the hook API if available (expo-video exposes useVideoPlayer)
      if (VideoModule?.useVideoPlayer && VideoModule?.VideoView) {
        try {
          // create player but don't auto-play; wait for user tap so preview (first frame) can show
          const player = VideoModule.useVideoPlayer ? VideoModule.useVideoPlayer(sourceObj) : null;
          // Try common prop names: 'player' and 'video'
          return (
            // @ts-ignore dynamic API
            <VideoModule.VideoView
              player={player}
              video={player}
              style={styles.videoPlayer}
              useNativeControls={true}
              onError={(e: any) => {
                setVideoLoading(false);
                setVideoPlaybackError(e?.message ?? String(e));
              }}
              onFirstFrameRender={() => setVideoLoading(false)}
              onLoadStart={() => { setVideoLoading(true); setVideoPlaybackError(null); }}
            />
          );
        } catch (e) {
          // useVideoPlayer path failed (silenced)
        }
      }

      // Show a play overlay when we have a player and are not yet playing.
      // The overlay is rendered by the parent modal (see below) because in some
      // implementations the VideoView is controlled via the player object.

      // If hook not available, but Video exists (expo-av style), use it
      if (VideoModule?.Video) {
  return (
          <VideoModule.Video
            source={sourceObj}
            style={styles.videoPlayer}
            useNativeControls
            resizeMode={VideoModule?.ResizeMode?.CONTAIN}
            shouldPlay={true}
            onLoadStart={() => { setVideoLoading(true); setVideoPlaybackError(null); }}
            onLoad={() => setVideoLoading(false)}
            onReadyForDisplay={() => setVideoLoading(false)}
            onError={(e: any) => {
              setVideoLoading(false);
              setVideoPlaybackError(e?.message ?? String(e));
            }}
          />
        );
      }

      // If VideoView exists without the hook, try basic VideoView with source prop
      if (VideoModule?.VideoView) {
        return (
          <VideoModule.VideoView
            source={sourceObj}
            style={styles.videoPlayer}
            useNativeControls={true}
            onError={(e: any) => {
              setVideoLoading(false);
              setVideoPlaybackError(e?.message ?? String(e));
            }}
            onFirstFrameRender={() => setVideoLoading(false)}
            onLoadStart={() => { setVideoLoading(true); setVideoPlaybackError(null); }}
          />
        );
      }

      // Last resort: if createVideoPlayer exists, attempt to create a player element.
      if (VideoModule?.createVideoPlayer) {
        try {
          const Player = VideoModule.createVideoPlayer({ source: sourceObj, style: styles.videoPlayer });
          return <Player />;
        } catch (e) {
          // createVideoPlayer failed (silenced)
        }
      }

      return null;
    } catch (e) {
      // InAppVideoRenderer unexpected error (silenced)
      return null;
    }
  };
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

  // Cargar perfil del usuario actual para usar su avatar en comentarios propios
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getCitizenProfile();
        if (!mounted) return;
        if (res?.data) {
          setCurrentUserId(res.data.usuario_id ?? null);
          setCurrentUserAvatar(res.data.avatar_url ?? null);
          setCurrentUserNombre(res.data.nombre ?? null);
          setCurrentUserApellido(res.data.apellido ?? null);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Generate thumbnails for videos that don't have a server-provided thumb_url
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Collect all video evidences across reports that lack a thumb_url
        const toGenerate: Array<{ url: string; storage_path: string }> = [];
        Object.keys(evidencesMap || {}).forEach((rId) => {
          const evList = evidencesMap[rId] || [];
          evList.forEach((ev: any) => {
            if (ev.tipo === 'VIDEO') {
              const key = String(ev.storage_path);
              const already = videoThumbs[key] || videoThumbsFailed[key] || videoThumbsLoading[key];
              const remote = (ev as any).thumb_url;
              if (!remote && !already) {
                toGenerate.push({ url: ev.url, storage_path: ev.storage_path });
              }
            }
          });
        });

        if (toGenerate.length === 0) return;

        // Avoid repeated attempts if module is missing
        if (thumbModuleMissing) {
          // mark all as failed so UI doesn't spin
          setVideoThumbsFailed((prev) => {
            const copy = { ...(prev || {}) };
            for (const it of toGenerate) copy[String(it.storage_path)] = true;
            return copy;
          });
          return;
        }

        let ThumbMod: any = null;
        try {
          ThumbMod = await import('expo-video-thumbnails');
        } catch (impErr) {
          setThumbModuleMissing(true);
          setVideoThumbsFailed((prev) => {
            const copy = { ...(prev || {}) };
            for (const it of toGenerate) copy[String(it.storage_path)] = true;
            return copy;
          });
          return;
        }

        if (!active) return;

        const createFnCandidates: Array<any> = [
          ThumbMod?.createThumbnailAsync,
          ThumbMod?.default?.createThumbnailAsync,
          ThumbMod?.createThumbnail,
          ThumbMod?.default,
          ThumbMod?.getThumbnailAsync,
          ThumbMod?.getThumbnail,
        ];
        const createFn = createFnCandidates.find((f) => typeof f === 'function') || null;
        if (!createFn) {
          setThumbModuleMissing(true);
          setVideoThumbsFailed((prev) => {
            const copy = { ...(prev || {}) };
            for (const it of toGenerate) copy[String(it.storage_path)] = true;
            return copy;
          });
          return;
        }

        for (const item of toGenerate) {
          const key = String(item.storage_path);
          setVideoThumbsLoading((prev) => ({ ...prev, [key]: true }));
          try {
            let result: any = null;
            if (createFn === ThumbMod || createFn === ThumbMod?.default) {
              result = await createFn(item.url, { time: 1000 });
            } else {
              result = await createFn(item.url, { time: 1000 });
            }
            const uri = result?.uri ?? result?.path ?? null;
            if (!uri) throw new Error('thumbnail result missing uri');
            if (!active) break;
            setVideoThumbs((prev) => ({ ...prev, [key]: uri }));
          } catch (thumbErr) {
            setVideoThumbsFailed((prev) => ({ ...prev, [key]: true }));
          } finally {
            setVideoThumbsLoading((prev) => ({ ...prev, [key]: false }));
          }
        }
      } catch (e) {
        // ignore thumbnail generation errors
      }
    })();
    return () => { active = false; };
  }, [evidencesMap]);

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

  // Intentar cargar expo-av/expo-video dinámicamente para reproducción de videos en-app
  useEffect(() => {
    let mounted = true;
    (async () => {
      // Intent: expo-video (nuevo) -> expo-av (fallback)
      try {
        const mod = await import('expo-video');
        const m: any = mod;
        const VideoComp = (m && (m.Video || m.default)) ?? null;
        const ResizeMode = m?.ResizeMode ?? (m?.Video?.ResizeMode) ?? null;
        if (mounted) {
          // store entire module to preserve hook exports like useVideoPlayer / VideoView
          setVideoModule({ ...(m || {}), Video: VideoComp, ResizeMode });
          setVideoImportError(null);
        }
        return;
      } catch (e1: any) {
        // try expo-av as fallback
        try {
          const mod2 = await import('expo-av');
          const m2: any = mod2;
          const VideoComp2 = (m2 && (m2.Video || m2.default)) ?? null;
          const ResizeMode2 = m2?.ResizeMode ?? (m2?.Video?.ResizeMode) ?? null;
          if (mounted) {
            setVideoModule({ ...(m2 || {}), Video: VideoComp2, ResizeMode: ResizeMode2 });
            setVideoImportError(null);
          }
          return;
        } catch (e2: any) {
          // registrar mensaje de error para diagnóstico en UI
          const msg = (e2 && e2.message) ? `${e2.message}` : String(e2 ?? e1);
          if (mounted) setVideoImportError(msg);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

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

      // Normalizar: si la API no incluye usuario_id ni avatar para el ciudadano pero el nombre/apellido
      // coincide con el perfil actual, inyectamos usuario_id y avatar para que el cliente muestre tu foto.
      const normalized = loadedReports.map((r: any) => {
        const c = r.ciudadano ?? {};
        // If no usuario_id and we have current user data, try to match by exact name+apellido
        if (!c.usuario_id && currentUserId && currentUserNombre && currentUserApellido) {
          const rn = String(c.nombre ?? '').trim();
          const ra = String(c.apellido ?? '').trim();
          if (rn && ra && rn === String(currentUserNombre).trim() && ra === String(currentUserApellido).trim()) {
            c.usuario_id = currentUserId;
            if (!c.avatar_url && currentUserAvatar) c.avatar_url = currentUserAvatar;
          }
        }
        r.ciudadano = c;
        return r;
      });

      setReports(normalized);

      // Inicializar stats para cada reporte y luego obtener valores reales
      const initialStats: Record<string, any> = {};
      loadedReports.forEach((r) => {
        initialStats[r.id] = { likes: 0, dislikes: 0, hasLiked: false, hasDisliked: false, commentsCount: 0 };
      });
      setReportStats(initialStats);

      // Cargar stats reales en background
      try {
        await Promise.all(loadedReports.map(async (r) => {
          try {
            const s = await fetchReportStats(r.id);
            setReportStats((prev) => ({
              ...prev,
              [r.id]: {
                likes: s.likes,
                dislikes: s.dislikes,
                hasLiked: s.userReaction === 'LIKE',
                hasDisliked: s.userReaction === 'DISLIKE',
                commentsCount: s.commentsCount,
              }
            }));
          } catch (e) {
            // ignore per-report
          }
        }));
        // Cargar evidencias firmadas por reporte (si existe la API)
        try {
          await Promise.all(loadedReports.map(async (r) => {
            try {
              setLoadingEvidencesMap((p) => ({ ...p, [r.id]: true }));
              const ev = await listEvidencesSigned(r.id);
              setEvidencesMap((p) => ({ ...p, [r.id]: ev || [] }));
            } catch (e) {
              setEvidencesMap((p) => ({ ...p, [r.id]: [] }));
            } finally {
              setLoadingEvidencesMap((p) => ({ ...p, [r.id]: false }));
            }
          }));
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // ignore
      }

      // Ya no buscamos "cercanas" porque el grupo ya contiene todas las relevantes
      setNearbyReports([]);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };


  const handleLike = async (reportId: string) => {
    try {
      // Llamada RPC para marcar LIKE (crea o actualiza)
      await reactToReport(reportId, 'LIKE');
      // Refrescar stats del reporte
      const s = await fetchReportStats(reportId);
      setReportStats((prev) => ({
        ...prev,
        [reportId]: {
          likes: s.likes,
          dislikes: s.dislikes,
          hasLiked: s.userReaction === 'LIKE',
          hasDisliked: s.userReaction === 'DISLIKE',
          commentsCount: s.commentsCount,
        }
      }));
    } catch (error) {
      // ignore
    }
  };

  const handleDislike = async (reportId: string) => {
    try {
      await reactToReport(reportId, 'DISLIKE');
      const s = await fetchReportStats(reportId);
      setReportStats((prev) => ({
        ...prev,
        [reportId]: {
          likes: s.likes,
          dislikes: s.dislikes,
          hasLiked: s.userReaction === 'LIKE',
          hasDisliked: s.userReaction === 'DISLIKE',
          commentsCount: s.commentsCount,
        }
      }));
    } catch (error) {
      // ignore
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
    // cargar comentarios antes de abrir el modal
    loadComments(reportId);
    setCommentsModalVisible(true);
  };

  const loadComments = async (reportId: string) => {
    try {
      setLoadingComments(true);
      const list = await fetchReportComments(reportId);
      // Normalizar y preferir avatar del usuario actual cuando corresponda
      const normalized = (list || []).map((c: any) => ({
        id: String(c.id),
        usuario_id: c.usuario_id ?? null,
        autor: c.autor ?? c.author ?? 'Usuario',
        contenido: c.contenido ?? c.text ?? '',
        created_at: c.created_at ? String(c.created_at) : undefined,
        avatar: (c.autor_avatar ?? c.avatar_url ?? c.foto ?? c.imagen_url) || (c.usuario_id && currentUserId && c.usuario_id === currentUserId ? currentUserAvatar : null),
        parent_id: c.parent_id ?? null,
        likes: c.likes ?? 0,
        liked: !!c.liked,
      }));
      setComments(normalized);
    } catch (e) {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async (parentId?: number | null) => {
    if (!selectedReportForComments || !commentText.trim()) return;
    try {
      setSubmittingComment(true);
      await createReportComment(selectedReportForComments, commentText.trim(), false, parentId ?? null);
      setCommentText('');
      // refrescar lista y contador
      await loadComments(selectedReportForComments);
      const s = await fetchReportStats(selectedReportForComments);
      setReportStats((prev) => ({
        ...prev,
        [selectedReportForComments]: {
          likes: s.likes,
          dislikes: s.dislikes,
          hasLiked: s.userReaction === 'LIKE',
          hasDisliked: s.userReaction === 'DISLIKE',
          commentsCount: s.commentsCount,
        }
      }));
    } catch (e) {
      // ignore
    } finally {
      setSubmittingComment(false);
    }
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
                          {/* Avatar preferente: imagen si existe, sino iniciales. Si ciudadano.usuario_id === currentUserId usar currentUserAvatar */}
                          {(
                            ((report as any).ciudadano?.avatar_url ?? (report as any).ciudadano?.imagen_url ?? (report as any).ciudadano?.foto) ??
                            (((report as any).ciudadano?.usuario_id && currentUserId && String((report as any).ciudadano?.usuario_id) === String(currentUserId)) ? currentUserAvatar : null)
                          ) ? (
                            <Image source={{ uri: ((report as any).ciudadano?.avatar_url ?? (report as any).ciudadano?.imagen_url ?? (report as any).ciudadano?.foto) ?? (((report as any).ciudadano?.usuario_id && currentUserId && String((report as any).ciudadano?.usuario_id) === String(currentUserId)) ? currentUserAvatar : null) }} style={styles.userAvatarImage} />
                          ) : (
                            <View style={[styles.userAvatar, { backgroundColor: accentColor }]}>
                              <Text style={[styles.userAvatarText, { fontSize: getFontSizeValue(fontSize, 18) }]}>{getInitials(report.ciudadano?.nombre, report.ciudadano?.apellido)}</Text>
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.userName, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>{`${report.ciudadano?.nombre || ''} ${report.ciudadano?.apellido || ''}`.trim() || 'Usuario'}</Text>
                            <Text style={[styles.reportDate, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 13) }]}>{formatDateTime(report.fecha_creacion)}</Text>
                          </View>
                        </View>
                      )}

                      {/* Separador visual entre perfil (avatar/nombre) y contenido */}
                      <View style={{ height: 1, backgroundColor: borderColor, marginVertical: 10 }} />

                      {/* Espaciado adicional entre avatar/usuario y contenido */}
                      <View style={{ marginTop: 12 }}>
                        <Text style={[{ color: mutedColor, fontSize: getFontSizeValue(fontSize, 14), marginBottom: 6, fontWeight: '600' }]}>Titulo:</Text>
                        <Text style={[styles.title, { color: textColor, fontSize: getFontSizeValue(fontSize, 20) }]}>{report.titulo}</Text>

                        <Text style={[{ color: mutedColor, fontSize: getFontSizeValue(fontSize, 14), marginTop: 10, marginBottom: 6, fontWeight: '600' }]}>descripcion:</Text>
                        <Text style={[styles.description, { color: textColor, fontSize: getFontSizeValue(fontSize, 15), marginTop: 4 }]}>{report.descripcion || ''}</Text>
                      </View>
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

                      {loadingEvidencesMap[report.id] ? (
                        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                          <ActivityIndicator size="small" color={accentColor} />
                          <Text style={{ marginTop: 8, color: mutedColor }}>Cargando fotos y videos...</Text>
                        </View>
                      ) : (evidencesMap[report.id] == null || evidencesMap[report.id].length === 0) ? (
                        <Text style={[styles.noEvidenceText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 13) }]}>Sin evidencia adjunta</Text>
                      ) : (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' }}
                        >
                          {(() => {
                            const evList = evidencesMap[report.id] || [];
                            const photos = evList.filter(e => e.tipo === 'FOTO');
                            return evList.map((ev) => {
                              if (ev.tipo === 'FOTO') {
                                const photoIndex = photos.findIndex(p => p.storage_path === ev.storage_path);
                                return (
                                  <TouchableOpacity
                                    key={ev.storage_path}
                                    onPress={() => { if (photoIndex >= 0) { setSelectedImageReport(report.id); setSelectedImageIndex(photoIndex); } }}
                                    activeOpacity={0.8}
                                    style={{ marginRight: 10 }}
                                  >
                                    <Image source={{ uri: ev.url }} style={[styles.thumbnail, { width: (SCREEN_WIDTH - 60) / 3, height: (SCREEN_WIDTH - 60) / 3 }]} />
                                  </TouchableOpacity>
                                );
                              }

                              // Video thumbnail (show remote or generated thumbnail when available)
                              return (
                                <TouchableOpacity
                                  key={ev.storage_path}
                                  onPress={() => setSelectedVideoUrl(ev.url)}
                                  activeOpacity={0.8}
                                  style={{ marginRight: 10 }}
                                >
                                  {(() => {
                                    const key = String(ev.storage_path);
                                    const local = videoThumbs[key];
                                    const loading = !!videoThumbsLoading[key];
                                    const failed = !!videoThumbsFailed[key];
                                    const remote = (ev as any).thumb_url;

                                    if (loading) {
                                      return (
                                        <View style={[styles.thumbnail, { justifyContent: 'center', alignItems: 'center', width: (SCREEN_WIDTH - 60) / 3, height: (SCREEN_WIDTH - 60) / 3 }]}>
                                          <ActivityIndicator color={accentColor} />
                                        </View>
                                      );
                                    }

                                    if (remote || local) {
                                      const uri = remote ?? local;
                                      return (
                                        <View style={[styles.thumbnail, { width: (SCREEN_WIDTH - 60) / 3, height: (SCREEN_WIDTH - 60) / 3 }]}>
                                          <Image
                                            source={{ uri }}
                                            style={[styles.thumbnail, { position: 'relative', width: (SCREEN_WIDTH - 60) / 3, height: (SCREEN_WIDTH - 60) / 3 }]}
                                            resizeMode="cover"
                                            onError={(e) => {
                                              setVideoThumbsFailed((prev) => ({ ...prev, [key]: true }));
                                            }}
                                          />
                                          <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                                            <IconSymbol name="play-circle" size={28} color={accentColor} />
                                          </View>
                                        </View>
                                      );
                                    }

                                    if (failed) {
                                      return (
                                        <View style={[styles.thumbnail, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', width: (SCREEN_WIDTH - 60) / 3, height: (SCREEN_WIDTH - 60) / 3 }]}>
                                          <Text style={{ color: '#fff', fontSize: 12 }}>Miniatura no disponible</Text>
                                          <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
                                            <IconSymbol name="play-circle" size={28} color={accentColor} />
                                          </View>
                                        </View>
                                      );
                                    }

                                    return (
                                      <View style={[styles.thumbnail, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000010', width: (SCREEN_WIDTH - 60) / 3, height: (SCREEN_WIDTH - 60) / 3 }]}>
                                        <IconSymbol name="play-circle" size={28} color={accentColor} />
                                      </View>
                                    );
                                  })()}
                                </TouchableOpacity>
                              );
                            });
                          })()}
                        </ScrollView>
                      )}
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

              {/* Footer con botón Volver (respetar safe-area para que no quede oculto) */}
              <View style={[styles.footer, { borderTopColor: borderColor, paddingBottom: insets.bottom ? insets.bottom + 4 : 6 }]}>
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

              {/* Contenido de comentarios (componente reutilizable) */}
              <View style={{ flex: 1 }}>
                {/* CommentsPanel maneja internamente su propio ScrollView y KeyboardAvoidingView. */}
                <CommentsPanel
                  comments={comments.map((c: any) => ({
                    id: String(c.id),
                    usuario_id: c.usuario_id ?? null,
                    author: c.autor ?? c.author ?? 'Usuario',
                    text: c.contenido ?? c.text ?? '',
                    created_at: c.created_at ? String(c.created_at) : undefined,
                    avatar: c.avatar ?? (c.avatar_url ?? c.autor_avatar ?? c.foto ?? c.imagen_url ?? null),
                    likes: c.likes ?? 0,
                    liked: !!c.liked,
                    parent_id: c.parent_id ?? null,
                  }))}
                  loading={loadingComments}
                  commentText={commentText}
                  setCommentText={setCommentText}
                  onSubmit={submitComment}
                  onLike={async (commentId: string, currentlyLiked: boolean) => {
                    // Optimistically update local comments state
                    setComments((prev) => prev.map((c: any) => c.id === commentId ? ({ ...c, likes: (c.likes ?? 0) + (currentlyLiked ? -1 : 1), liked: !currentlyLiked }) : c));
                    // Call API and inspect result to rollback on failure
                    try {
                      const res = await reactToComment(Number(commentId), currentlyLiked ? 'DISLIKE' : 'LIKE');
                      if (res == null || (res as any).error) {
                        // rollback
                        setComments((prev) => prev.map((c: any) => c.id === commentId ? ({ ...c, likes: (c.likes ?? 0) + (currentlyLiked ? 1 : -1), liked: currentlyLiked }) : c));
                      }
                    } catch (e) {
                      // rollback on throw
                      setComments((prev) => prev.map((c: any) => c.id === commentId ? ({ ...c, likes: (c.likes ?? 0) + (currentlyLiked ? 1 : -1), liked: currentlyLiked }) : c));
                    }
                  }}
                  currentUserId={currentUserId}
                  currentUserAvatar={currentUserAvatar}
                  currentUserName={((currentUserNombre || '') + ' ' + (currentUserApellido || '')).trim() || null}
                  onEdit={async (commentId: string, newText: string) => {
                    if (!selectedReportForComments) return;
                    // Optimistic update
                    const prev = comments;
                    setComments((prevList) => prevList.map((c: any) => c.id === commentId ? ({ ...c, contenido: newText, text: newText }) : c));
                    try {
                      const res = await updateReportComment(Number(commentId), newText);
                      if (res?.error) {
                        // rollback
                        setComments(prev);
                      } else {
                        // refresh list and stats
                        await loadComments(selectedReportForComments);
                        const s = await fetchReportStats(selectedReportForComments);
                        setReportStats((prev) => ({
                          ...prev,
                          [selectedReportForComments]: {
                            likes: s.likes,
                            dislikes: s.dislikes,
                            hasLiked: s.userReaction === 'LIKE',
                            hasDisliked: s.userReaction === 'DISLIKE',
                            commentsCount: s.commentsCount,
                          }
                        }));
                      }
                    } catch (e) {
                      setComments(prev);
                    }
                  }}
                  onDelete={async (commentId: string) => {
                    if (!selectedReportForComments) return;
                    const prev = comments;
                    // Optimistic remove
                    setComments((prevList) => prevList.filter((c: any) => c.id !== commentId));
                    try {
                      const res = await deleteReportComment(Number(commentId));
                      if (res?.error) {
                        // rollback
                        setComments(prev);
                      } else {
                        // refresh stats
                        const s = await fetchReportStats(selectedReportForComments);
                        setReportStats((prev) => ({
                          ...prev,
                          [selectedReportForComments]: {
                            likes: s.likes,
                            dislikes: s.dislikes,
                            hasLiked: s.userReaction === 'LIKE',
                            hasDisliked: s.userReaction === 'DISLIKE',
                            commentsCount: s.commentsCount,
                          }
                        }));
                      }
                    } catch (e) {
                      setComments(prev);
                    }
                  }}
                />
              </View>
            </Animated.View>
          </View>
        </Modal>

        {/* Modal de galería de imágenes */}
        {selectedImageIndex !== null && selectedImageReport && (evidencesMap[selectedImageReport] || []).filter(e => e.tipo === 'FOTO').length > 0 && selectedImageIndex < (evidencesMap[selectedImageReport] || []).filter(e => e.tipo === 'FOTO').length && (
          <Modal
            visible
            animationType="fade"
            transparent
            onRequestClose={() => { setSelectedImageIndex(null); setSelectedImageReport(null); }}
          >
            <View style={styles.galleryOverlay}>
              <TouchableOpacity
                style={styles.galleryClose}
                onPress={() => { setSelectedImageIndex(null); setSelectedImageReport(null); }}
              >
                <IconSymbol name="close" size={32} color="#fff" />
              </TouchableOpacity>
              <Image
                source={{ uri: (evidencesMap[selectedImageReport || ''] || []).filter(e => e.tipo === 'FOTO')[selectedImageIndex || 0]?.url || '' }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              <View style={styles.galleryIndicator}>
                <Text style={[styles.galleryIndicatorText, { fontSize: getFontSizeValue(fontSize, 14) }]}>
                  {(selectedImageIndex || 0) + 1} / {(evidencesMap[selectedImageReport || ''] || []).filter(e => e.tipo === 'FOTO').length}
                </Text>
              </View>
            </View>
          </Modal>
        )}

        {/* Modal de reproducción de video (in-app) */}
        {selectedVideoUrl && (
          <Modal
            visible
            animationType="slide"
            transparent
            onRequestClose={() => setSelectedVideoUrl(null)}
          >
            <View style={styles.galleryOverlay}>
              <TouchableOpacity
                style={styles.galleryClose}
                onPress={() => setSelectedVideoUrl(null)}
              >
                <IconSymbol name="close" size={32} color="#fff" />
              </TouchableOpacity>
              {(VideoModule?.Video || VideoModule?.VideoView || VideoModule?.createVideoPlayer) ? (
                <>
                  <InAppVideoRenderer uri={selectedVideoUrl} />
                  {videoLoading ? (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                      <ActivityIndicator size="large" color={accentColor} />
                    </View>
                  ) : null}
                  {videoPlaybackError ? (
                    <View style={{ padding: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#FFBABA', backgroundColor: '#3B0A0A', padding: 8, borderRadius: 8 }}>{videoPlaybackError}</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: textColor, marginBottom: 12 }}>El reproductor nativo no está disponible en esta build.</Text>
                  <Text style={{ color: mutedColor, marginBottom: 20, textAlign: 'center' }}>Para reproducir videos dentro de la app necesitas instalar un Dev Client o generar una build que incluya el módulo nativo.</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={async () => {
                      try {
                        if (!selectedVideoUrl) return;
                        const can = await Linking.canOpenURL(selectedVideoUrl);
                        if (can) await Linking.openURL(selectedVideoUrl);
                        else await Share.share({ url: selectedVideoUrl, message: selectedVideoUrl });
                      } catch (e) {
                        try { await Share.share({ url: selectedVideoUrl || '', message: selectedVideoUrl || '' }); } catch (ee) { }
                      }
                    }} style={[styles.backButton, { width: 160, alignSelf: 'center' }]}>
                      <Text style={[styles.backButtonText, { color: buttonText }]}>Abrir en reproductor</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setSelectedVideoUrl(null)} style={[styles.backButton, { width: 120, alignSelf: 'center' }]}>
                      <Text style={[styles.backButtonText, { color: buttonText }]}>Cerrar</Text>
                    </TouchableOpacity>
                  </View>
                  {videoImportError ? (
                    <Text style={{ color: '#FFBABA', backgroundColor: '#3B0A0A', padding: 8, borderRadius: 8, marginTop: 8 }}>{videoImportError}</Text>
                  ) : null}
                </View>
              )}
            </View>
          </Modal>
        )}
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
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
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
    height: '94%',
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
  // Gallery & media styles (copied from profile modal)
  thumbnail: {
    borderRadius: 12,
    backgroundColor: '#00000010',
  },
  userAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  commentAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    color: '#FFFFFF',
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
    height: '80%'
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
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: '60%',
    backgroundColor: '#000',
    borderRadius: 12,
  },
  commentsInputPlaceholder: {
    fontSize: 14,
  },
});
