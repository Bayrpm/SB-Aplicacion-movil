import { listEvidencesSigned } from '@/app/features/report/api/evidences.api';
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
// expo-av will be imported dynamically at runtime to avoid native-module require on startup
import { deleteReportComment, updateReportComment } from '@/app/features/report/api/report.api';
import CommentsPanel, { CommentItem } from '@/components/commentsPanel';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CitizenReport, createReportComment, fetchReportComments, fetchReportStats, getCategoryById, getCitizenProfile, getEstadoById, reactToComment, reactToReport } from '../api/profile.api';

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
  const insets = useSafeAreaInsets();
  const { fontSize } = useFontSize();
  const bgColor = useThemeColor({ light: '#FFFFFF', dark: '#071229' }, 'background'); // Color específico para cards
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint'); // Azul siempre
  const mutedColor = useThemeColor({}, 'icon');
  const borderColor = mutedColor + '26';
  const itemBg = useThemeColor({ light: '#F9FAFB', dark: '#0A1628' }, 'background');
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
  const [resolvedCitizenAvatar, setResolvedCitizenAvatar] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [evidences, setEvidences] = useState<Array<{ tipo: 'FOTO'|'VIDEO'; url: string; storage_path: string }>>([]);
  const [loadingEvidences, setLoadingEvidences] = useState<boolean>(false);
  const [VideoModule, setVideoModule] = useState<any>(null);
  const [videoImportError, setVideoImportError] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState<boolean>(false);
  const [videoPlaybackError, setVideoPlaybackError] = useState<string | null>(null);
  // Stats and comments UI (per-report)
  const [reportStats, setReportStats] = useState<Record<string, {
    likes: number;
    dislikes: number;
    hasLiked: boolean;
    hasDisliked: boolean;
    commentsCount: number;
  }>>({});
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedReportForComments, setSelectedReportForComments] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [translateY] = useState(new Animated.Value(0));
  // PanResponder para el modal de comentarios (drag to dismiss)
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_: any, gestureState: any) => {
      return Math.abs(gestureState.dy) > 5;
    },
    onPanResponderMove: (_: any, gestureState: any) => {
      if (gestureState.dy > 0) translateY.setValue(gestureState.dy);
    },
    onPanResponderRelease: (_: any, gestureState: any) => {
      const threshold = 150;
      const velocity = gestureState.vy;
      if (gestureState.dy > threshold || (gestureState.dy > 50 && velocity > 0.5)) {
        Animated.timing(translateY, { toValue: 1000, duration: 250, useNativeDriver: true }).start(() => {
          setCommentsModalVisible(false);
          setSelectedReportForComments(null);
        });
      } else {
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      }
    },
  });

  useEffect(() => {
    // Reset translate when modal opens/closes
    translateY.setValue(0);
  }, [commentsModalVisible]);

  // Cargar evidencias (firmadas) al abrir el modal
  useEffect(() => {
    let active = true;
    (async () => {
      if (visible && report?.id) {
        setLoadingEvidences(true);
      }
      try {
        if (visible && report?.id) {
          const ev = await listEvidencesSigned(report.id);
          if (active) setEvidences(ev);
        } else {
          setEvidences([]);
        }
      } catch (e) {
        // Error al cargar evidencias: se omite el log de depuración en producción
      }
      finally {
        if (active) setLoadingEvidences(false);
      }
    })();
    return () => { active = false; };
  }, [visible, report?.id]);

  // Initialize stats when report changes
  useEffect(() => {
    if (report) {
      setReportStats({
        [report.id]: {
          likes: report.likes_count ?? 0,
          dislikes: (report as any).dislikes_count ?? 0,
          hasLiked: false,
          hasDisliked: false,
          commentsCount: (report as any).comments_count ?? 0,
        }
      });

      // cargar stats reales
      (async () => {
        try {
          const s = await fetchReportStats(report.id);
          setReportStats((prev) => ({
            ...prev,
            [report.id]: {
              likes: s.likes,
              dislikes: s.dislikes,
              hasLiked: s.userReaction === 'LIKE',
              hasDisliked: s.userReaction === 'DISLIKE',
              commentsCount: s.commentsCount,
            }
          }));
        } catch (e) {
          // ignore
        }
      })();
    }
  }, [report?.id]);

  // Handlers that operate per-report (mirror app/features/report implementation)
  const handleLike = async (reportId: string) => {
    try {
      await reactToReport(reportId, 'LIKE');
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
    } catch (e) {
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
    } catch (e) {
      // ignore
    }
  };

  const handleComments = (reportId: string) => {
    setSelectedReportForComments(reportId);
    loadComments(reportId);
    setCommentsModalVisible(true);
  };

  const loadComments = async (reportId: string) => {
    try {
      setLoadingComments(true);
      const list = await fetchReportComments(reportId);
      const normalized = (list || []).map((c: any) => ({
        id: String(c.id),
        usuario_id: c.usuario_id ?? null,
        author: c.autor ?? c.author ?? 'Usuario',
        text: c.contenido ?? c.text ?? '',
        created_at: c.created_at ? String(c.created_at) : undefined,
        // Si el comentario pertenece al usuario actual, preferimos su avatar de perfil
        avatar: (c.autor_avatar ?? c.avatar_url ?? c.foto ?? c.imagen_url) || (c.usuario_id && currentUserId && c.usuario_id === currentUserId ? resolvedCitizenAvatar : null),
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


  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import('expo-video');
        const m: any = mod;
        const VideoComp = (m && (m.Video || m.default)) ?? null;
        const ResizeMode = m?.ResizeMode ?? (m?.Video?.ResizeMode) ?? null;
        if (mounted) {
          setVideoModule({ Video: VideoComp, ResizeMode });
          setVideoImportError(null);
          // Diagnostic log: confirmar que el módulo dinámico se cargó
          try { console.log('reportDetailModal: loaded expo-video module', { VideoCompPresent: !!VideoComp, ResizeMode }); } catch (e) {}
          try { console.log('reportDetailModal: expo-video module keys', Object.keys(m || {})); } catch (e) {}
        }
        return;
      } catch (e1: any) {
        try {
          const mod2 = await import('expo-av');
          const m2: any = mod2;
          const VideoComp2 = (m2 && (m2.Video || m2.default)) ?? null;
          const ResizeMode2 = m2?.ResizeMode ?? (m2?.Video?.ResizeMode) ?? null;
          if (mounted) {
            setVideoModule({ Video: VideoComp2, ResizeMode: ResizeMode2 });
            setVideoImportError(null);
            try { console.log('reportDetailModal: loaded expo-av module', { VideoCompPresent: !!VideoComp2, ResizeMode: ResizeMode2 }); } catch (e) {}
            try { console.log('reportDetailModal: expo-av module keys', Object.keys(m2 || {})); } catch (e) {}
          }
          return;
        } catch (e2: any) {
          const msg = (e2 && e2.message) ? `${e2.message}` : String(e2 ?? e1);
          if (mounted) setVideoImportError(msg);
          try { console.error('reportDetailModal: dynamic import failed', e1, e2); } catch (ee) {}
        }
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
    if (!isAnonymous && report) {
    getCitizenProfile().then((res) => {
      if (!mounted || !res?.data) return;
      const { nombre, apellido, email, telefono, avatar_url, usuario_id } = res.data as any;
      // Guardar datos básicos, usuario_id y avatar por separado. Esto cubre el caso
      // en que `report.ciudadano` existe pero no incluye `avatar_url`.
      setResolvedCitizen({ nombre, apellido, email, telefono });
      setResolvedCitizenAvatar(avatar_url ?? null);
      setCurrentUserId(usuario_id ?? null);
      });
    }
    return () => {
      mounted = false;
    };
  }, [report?.anonimo, report?.ciudadano]);

  // Small renderer that adapts to different exports from expo-video / expo-av.
  // Tries in order: Video (expo-av compatible), VideoView (expo-video), otherwise null.
  const InAppVideoRenderer = ({ uri }: { uri: string }) => {
    try {
      // Build a VideoSource object when possible to help the native player
      const isMp4 = typeof uri === 'string' && /\.mp4(\?|$)/i.test(uri);
      const sourceObj: any = isMp4 ? { uri, contentType: 'video/mp4', overrideFileExtensionAndroid: 'mp4', useCaching: true } : { uri };

      // Prefer the hook API if available (expo-video exposes useVideoPlayer)
      if (VideoModule?.useVideoPlayer && VideoModule?.VideoView) {
        try { console.log('reportDetailModal: using useVideoPlayer + VideoView'); } catch (e) {}
        try {
          const player = VideoModule.useVideoPlayer(sourceObj, (p: any) => { try { p.play(); } catch {} });
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
                try { console.error('reportDetailModal: VideoView(onError) via useVideoPlayer', e); setVideoPlaybackError(e?.message ?? String(e)); } catch (ex) { setVideoPlaybackError(String(e)); }
              }}
              onFirstFrameRender={() => setVideoLoading(false)}
              onLoadStart={() => { setVideoLoading(true); setVideoPlaybackError(null); }}
            />
          );
        } catch (e) {
          try { console.error('reportDetailModal: useVideoPlayer path failed', e); } catch (ex) {}
        }
      }

      // If hook not available, but Video exists (expo-av style), use it
      if (VideoModule?.Video) {
        try { console.log('reportDetailModal: using Video export'); } catch (e) {}
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
              try { console.error('reportDetailModal: Video onError', e); setVideoPlaybackError(e?.message ?? String(e)); } catch (ex) { setVideoPlaybackError(String(e)); }
            }}
          />
        );
      }

      // If VideoView exists without the hook, try basic VideoView with source prop
      if (VideoModule?.VideoView) {
        try { console.log('reportDetailModal: using VideoView export (no hook)'); } catch (e) {}
        return (
          <VideoModule.VideoView
            source={sourceObj}
            style={styles.videoPlayer}
            useNativeControls={true}
            onError={(e: any) => {
              setVideoLoading(false);
              try { console.error('reportDetailModal: VideoView onError', e); setVideoPlaybackError(e?.message ?? String(e)); } catch (ex) { setVideoPlaybackError(String(e)); }
            }}
            onFirstFrameRender={() => setVideoLoading(false)}
            onLoadStart={() => { setVideoLoading(true); setVideoPlaybackError(null); }}
          />
        );
      }

      // Last resort: if createVideoPlayer exists, attempt to create a player element.
      if (VideoModule?.createVideoPlayer) {
        try { console.log('reportDetailModal: using createVideoPlayer export'); } catch (e) {}
        try {
          const Player = VideoModule.createVideoPlayer({ source: sourceObj, style: styles.videoPlayer });
          return <Player />;
        } catch (e) {
          try { console.error('reportDetailModal: createVideoPlayer failed', e); } catch (ex) {}
        }
      }

      return null;
    } catch (e) {
      try { console.error('reportDetailModal: InAppVideoRenderer unexpected error', e); } catch (ex) {}
      return null;
    }
  };

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

  const stats = report ? (reportStats[report.id] ?? {
    likes: report.likes_count ?? 0,
    dislikes: (report as any).dislikes_count ?? 0,
    hasLiked: false,
    hasDisliked: false,
    commentsCount: (report as any).comments_count ?? 0,
  }) : { likes: 0, dislikes: 0, hasLiked: false, hasDisliked: false, commentsCount: 0 };

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
                    {/* Avatar del ciudadano si existe. Si no hay imagen mostramos iniciales (Nombre + primer apellido) */}
                        {(() => {
                          const avatarUri = (report.ciudadano && (((report.ciudadano as any).avatar_url) || (report.ciudadano as any).foto || (report.ciudadano as any).imagen_url))
                            ? ((report.ciudadano as any).avatar_url || (report.ciudadano as any).foto || (report.ciudadano as any).imagen_url)
                            : (resolvedCitizenAvatar || null);

                          if (avatarUri) {
                            return <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />;
                          }

                          // Fallback: iniciales
                          const initials = getInitials(userName || `${(report.ciudadano as any)?.nombre || ''} ${(report.ciudadano as any)?.apellido || ''}`);
                          return (
                            <View style={[styles.headerAvatar, { backgroundColor: accentColor, alignItems: 'center', justifyContent: 'center' }]}> 
                              <Text style={[styles.commentAvatarText, { fontSize: getFontSizeValue(fontSize, 14) }]}>{initials}</Text>
                            </View>
                          );
                        })()}
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

                {loadingEvidences ? (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={accentColor} />
                    <Text style={{ marginTop: 8, color: mutedColor }}>Cargando fotos y videos...</Text>
                  </View>
                ) : (
                  evidences.length === 0 ? (
                    <View style={styles.noFilesBox}>
                      <IconSymbol name="image" size={64} color={mutedColor} />
                      <Text style={[styles.noFilesText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 14) }]}>                      
                        No hay fotos ni videos disponibles
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' }}
                    >
                      {(() => {
                        const photos = evidences.filter(e => e.tipo === 'FOTO');
                        return evidences.map((ev) => {
                          if (ev.tipo === 'FOTO') {
                            const photoIndex = photos.findIndex(p => p.storage_path === ev.storage_path);
                            return (
                              <TouchableOpacity
                                key={ev.storage_path}
                                onPress={() => { if (photoIndex >= 0) setSelectedImageIndex(photoIndex); }}
                                activeOpacity={0.8}
                                style={{ marginRight: 10 }}
                              >
                                <Image source={{ uri: ev.url }} style={styles.thumbnail} />
                              </TouchableOpacity>
                            );
                          }

                          // VIDEO thumbnail with in-app playback
                          return (
                            <TouchableOpacity
                              key={ev.storage_path}
                              onPress={() => { console.log('reportDetailModal: open in-app video', ev.url); setSelectedVideoUrl(ev.url); }}
                              activeOpacity={0.8}
                              style={{ marginRight: 10 }}
                            >
                              <View style={[styles.thumbnail, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000010' }]}>
                                <IconSymbol name="play-circle" size={28} color={accentColor} />
                              </View>
                            </TouchableOpacity>
                          );
                        });
                      })()}
                    </ScrollView>
                  )
                )}
              </View>

              {/* Acciones: estilo Instagram (like, dislike, comentarios) justo debajo de Evidencias */}
              <View style={[styles.instagramActions, { borderTopColor: borderColor, marginTop: 6 }]}> 
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
                </View>
              </View>
              {/* Contador de likes/dislikes y enlace para ver comentarios (igual que en report modal) */}
              <View style={styles.instagramStats}>
                {((stats.likes || 0) > 0 || (stats.dislikes || 0) > 0) && (
                  <Text style={[styles.instagramStatsText, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                    {(stats.likes || 0) > 0 && `${stats.likes} Me gusta`}
                    {(stats.likes || 0) > 0 && (stats.dislikes || 0) > 0 && ' · '}
                    {(stats.dislikes || 0) > 0 && `${stats.dislikes} No me gusta`}
                  </Text>
                )}
                {(stats.commentsCount || 0) > 0 && (
                  <TouchableOpacity onPress={() => handleComments(report.id)} activeOpacity={0.7}>
                    <Text style={[styles.instagramCommentsLink, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 14) }]}> 
                      Ver los {stats.commentsCount} comentarios
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            {/* Footer con botón Volver (estilo igual que en report/components) */}
            <View style={[styles.footer, { borderTopColor: borderColor }]}> 
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                style={[styles.backButtonBottom, { backgroundColor: accentColor }]}
              >
                <Text style={[styles.backButtonBottomText, { color: '#FFFFFF', fontSize: getFontSizeValue(fontSize, 15) }]}>Volver</Text>
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
                      try { await Share.share({ url: selectedVideoUrl || '', message: selectedVideoUrl || '' }); } catch (ee) {}
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

      {/* Modal de comentarios (estilo deslizable similar a report/components) */}
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
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={styles.commentsHandle} {...panResponder.panHandlers}>
              <View style={[styles.commentsHandleBar, { backgroundColor: mutedColor }]} />
            </View>

            <View style={[styles.commentsHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.commentsHeaderTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>Comentarios</Text>
              <TouchableOpacity
                onPress={() => setCommentsModalVisible(false)}
                style={styles.commentsCloseButton}
              >
                <IconSymbol name="xmark.circle.fill" size={24} color={mutedColor} />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
              <CommentsPanel
                comments={comments}
                loading={loadingComments}
                commentText={commentText}
                setCommentText={setCommentText}
                onSubmit={submitComment}
                onLike={async (commentId: string, currentlyLiked: boolean) => {
                  // Optimistically update comments locally
                  setComments((prev) => prev.map((c) => c.id === commentId ? ({ ...c, likes: (c.likes ?? 0) + (currentlyLiked ? -1 : 1), liked: !currentlyLiked }) : c));
                  try {
                    const res = await reactToComment(Number(commentId), currentlyLiked ? 'DISLIKE' : 'LIKE');
                    if (res == null || (res as any).error) {
                      setComments((prev) => prev.map((c) => c.id === commentId ? ({ ...c, likes: (c.likes ?? 0) + (currentlyLiked ? 1 : -1), liked: currentlyLiked }) : c));
                    }
                  } catch (e) {
                    // rollback
                    setComments((prev) => prev.map((c) => c.id === commentId ? ({ ...c, likes: (c.likes ?? 0) + (currentlyLiked ? 1 : -1), liked: currentlyLiked }) : c));
                  }
                }}
                onReply={(c) => {
                  // Prefill handled by CommentsPanel but we still expose this hook
                  setCommentText(`@${(c.author || 'Usuario').split(' ')[0]} `);
                }}
                onEdit={async (commentId: string, newText: string) => {
                  if (!selectedReportForComments) return;
                  // Optimistic update
                  const prev = comments;
                  setComments((p) => p.map((c) => c.id === commentId ? ({ ...c, text: newText }) : c));
                  try {
                    const res = await updateReportComment(Number(commentId), newText);
                    if (res?.error) {
                      console.error('updateReportComment error:', res.error);
                      AppAlert.alert('Error', typeof res.error === 'string' ? res.error : String((res.error as any)?.message ?? res.error));
                      setComments(prev);
                      return;
                    }
                    // reload comments and stats
                    await loadComments(selectedReportForComments);
                    const s = await fetchReportStats(selectedReportForComments);
                    setReportStats((prevStats) => ({
                      ...prevStats,
                      [selectedReportForComments]: {
                        likes: s.likes,
                        dislikes: s.dislikes,
                        hasLiked: s.userReaction === 'LIKE',
                        hasDisliked: s.userReaction === 'DISLIKE',
                        commentsCount: s.commentsCount,
                      }
                    }));
                  } catch (e) {
                    console.error('updateReportComment exception', e);
                    AppAlert.alert('Error', 'No se pudo modificar el comentario');
                    setComments(prev);
                  }
                }}
                onDelete={async (commentId: string) => {
                  if (!selectedReportForComments) return;
                  try {
                    const res = await deleteReportComment(Number(commentId));
                    if (res?.error) {
                      console.error('deleteReportComment error:', res.error);
                      AppAlert.alert('Error', typeof res.error === 'string' ? res.error : String((res.error as any)?.message ?? res.error));
                      return;
                    }
                    await loadComments(selectedReportForComments);
                    const s = await fetchReportStats(selectedReportForComments);
                    setReportStats((prevStats) => ({
                      ...prevStats,
                      [selectedReportForComments]: {
                        likes: s.likes,
                        dislikes: s.dislikes,
                        hasLiked: s.userReaction === 'LIKE',
                        hasDisliked: s.userReaction === 'DISLIKE',
                        commentsCount: s.commentsCount,
                      }
                    }));
                  } catch (e) {
                    console.error('deleteReportComment exception', e);
                    AppAlert.alert('Error', 'No se pudo eliminar el comentario');
                  }
                }}
                currentUserId={currentUserId}
                currentUserAvatar={resolvedCitizenAvatar}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
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

// Devuelve iniciales: primera letra del primer nombre y primera letra del primer apellido (penúltima palabra si hay 3+)
function getInitials(fullName: string): string {
  try {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    if (parts.length === 2) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    const first = parts[0].charAt(0).toUpperCase();
    const firstSurname = parts[parts.length - 2].charAt(0).toUpperCase();
    return `${first}${firstSurname}`;
  } catch (e) {
    return 'U';
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
    paddingVertical: 12,
    borderTopWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  // Footer bottom button (igual que en report/components)
  backButtonBottom: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
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
  // Estilos estilo Instagram para acciones pequeñas
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
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: '60%',
    backgroundColor: '#000',
    borderRadius: 12,
  },
  commentsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  commentsModalContainer: {
    width: '100%',
    height: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  commentsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#00000010',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    backgroundColor: '#EEE',
    overflow: 'hidden',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  commentAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
