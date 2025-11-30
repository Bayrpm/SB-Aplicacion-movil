import { useAuth } from '@/app/features/auth/context';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Network from 'expo-network';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  PixelRatio,
  Platform,
  Alert as RNAlert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { uploadEvidenceForReportWithProgress, type EvidenceKind } from '../api/evidences.api';
import { checkRecentReportByCategory, createReport } from '../api/report.api';
import { useReportModal } from '../context';
import { useReportCategories } from '../hooks/useReportCategories';
import { geocodeAddress } from '../lib/googleGeocoding';
import type { ReportCategory } from '../types';
import { setLocationEditCallback } from '../types/locationBridge';
import { setReportFormSnapshot } from '../types/reportFormBridge';

type Props = { onClose?: () => void; categoryId?: number; onBack?: () => void; };
type TIRef = React.RefObject<TextInput | null>;

type InitialData = {
  titulo?: string;
  descripcion?: string;
  anonimo?: boolean;
  ubicacionTexto?: string;
  coords?: { x?: number; y?: number };
};

type PropsExtended = Props & { initialData?: InitialData };

export default function ReportForm({ onClose, categoryId, onBack, initialData }: PropsExtended) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const categories = useReportCategories();
  const { setReportFormOpen } = useReportModal();

  const [localCategory, setLocalCategory] = useState<ReportCategory | null>(null);
  const [catLoading, setCatLoading] = useState(true);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [anonimo, setAnonimo] = useState(false);
  const [ubicacionTexto, setUbicacionTexto] = useState('');

  // Inicializar desde initialData si está presente
  useEffect(() => {
    if (!initialData) return;
    if (initialData.titulo) setTitulo(initialData.titulo);
    if (initialData.descripcion) setDescripcion(initialData.descripcion);
    if (typeof initialData.anonimo === 'boolean') setAnonimo(initialData.anonimo);
    if (initialData.ubicacionTexto) setUbicacionTexto(initialData.ubicacionTexto);
    if (initialData.coords) setCoords(initialData.coords);
  }, [initialData]);

  const [coords, setCoords] = useState<{ x?: number; y?: number }>({});
  const [submitting, setSubmitting] = useState(false);
  type Attachment = { uri: string; kind: EvidenceKind; progress: number; status: 'queued'|'uploading'|'done'|'error'; tries: number };
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // ===== Teclado
  const [kbH, setKbH] = useState(0);
  const [kbShown, setKbShown] = useState(false);
  // Detectar si en Android la ventana se "reduce" (adjustResize) o se "desplaza" (adjustPan) midiendo el alto real del contenedor
  const [rootH, setRootH] = useState<number>(Dimensions.get('window').height);
  const baseRootHRef = useRef<number>(Dimensions.get('window').height);
  const [androidKbMode, setAndroidKbMode] = useState<'resize' | 'pan'>('resize');
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(showEvt as any, (e: any) => {
      setKbShown(true);
      setKbH(e?.endCoordinates?.height ?? 0);
      // Evaluar si el alto del contenedor se redujo (Android adjustResize) o no (adjustPan)
      if (Platform.OS === 'android') {
        try {
          const delta = Math.max(0, (baseRootHRef.current || 0) - (rootH || 0));
          setAndroidKbMode(delta > 40 ? 'resize' : 'pan');
        } catch {}
      }
      setTimeout(() => autoEnsureCurrent(), 0);
      setTimeout(() => autoEnsureCurrent(), 80);
    });
    const s2 = Keyboard.addListener(hideEvt as any, () => { setKbShown(false); setKbH(0); });
    return () => { s1.remove(); s2.remove(); };
  }, []);

  // ===== Categoría
  useEffect(() => {
    if (!categoryId) { setLocalCategory(null); setCatLoading(false); return; }
    setCatLoading(true);
    const found = categories.find(c => c.id === categoryId) ?? null;
    if (found) { setLocalCategory(found); setCatLoading(false); return; }
    setLocalCategory({ id: categoryId, idx: 0, nombre: '', descripcion: '', orden: 0, activo: true });
  }, [categoryId, categories]);

  // ===== Estado modal
  useEffect(() => { setReportFormOpen(true); return () => setReportFormOpen(false); }, [setReportFormOpen]);

  // ===== Coords aprox
  // Solo establecer coordenadas aproximadas si NO vienen desde edición ni ya existen
  useEffect(() => {
    (async () => {
      try {
        const hasInitial = Boolean(initialData && (initialData.ubicacionTexto || (initialData.coords && (initialData.coords.x || initialData.coords.y))));
        const hasCoords = Boolean(coords.x && coords.y);
        if (hasInitial || hasCoords) return;
        const loc = await (await import('expo-location')).getCurrentPositionAsync({});
        setCoords({ x: Number(loc.coords.latitude.toFixed(4)), y: Number(loc.coords.longitude.toFixed(4)) });
      } catch {}
    })();
  }, [initialData, coords.x, coords.y]);

  const handleSubmit = async () => {
    if (!user?.id) { RNAlert.alert('Debes iniciar sesión', 'Inicia sesión para enviar una denuncia.'); return; }
    if (!titulo.trim() || !descripcion.trim()) { RNAlert.alert('Campos incompletos', 'Por favor ingresa título y descripción.'); return; }
    // Verificar conexión antes de intentar enviar
    try {
      const st = await Network.getNetworkStateAsync();
      const connected = !!st.isConnected && st.isInternetReachable !== false;
      if (!connected) {
        AppAlert.alert('Sin conexión a la red', 'Por favor verifica tu conexión a internet.', [
          { text: 'Reintentar', onPress: () => handleSubmit() },
          { text: 'Cancelar', style: 'cancel' },
        ]);
        return;
      }
    } catch {
      AppAlert.alert('Sin conexión a la red', 'Por favor verifica tu conexión a internet.', [
        { text: 'Reintentar', onPress: () => handleSubmit() },
        { text: 'Cancelar', style: 'cancel' },
      ]);
      return;
    }
    
    // Validar mínimo 30 caracteres en descripción
    if (descripcion.trim().length < 30) {
      AppAlert.alert('Descripción muy corta', 'La descripción debe tener al menos 30 caracteres');
      return;
    }

  setSubmitting(true);
    try {
      // Calcular coordenadas a usar en variables locales para evitar race con setState
      let useX: number | undefined = coords.x;
      let useY: number | undefined = coords.y;

      if (ubicacionTexto.trim() && (!useX || !useY)) {
        try {
          const g = await geocodeAddress(ubicacionTexto.trim());
          if (g && g.lat != null && g.lon != null) {
            useX = Number(g.lat.toFixed(4));
            useY = Number(g.lon.toFixed(4));
          }
        } catch {}
      }
      if (!useX || !useY) {
        try {
          const loc = await (await import('expo-location')).getCurrentPositionAsync({});
          if (loc?.coords?.latitude != null && loc?.coords?.longitude != null) {
            useX = Number(loc.coords.latitude.toFixed(4));
            useY = Number(loc.coords.longitude.toFixed(4));
          }
        } catch {}
      }

      // Validar que no haya denuncia reciente de la misma categoría EN LA MISMA UBICACIÓN (últimas 24h, radio 30m)
      // IMPORTANTE: Validar DESPUÉS de calcular las coordenadas finales
      if (categoryId && useX && useY) {
        try {
          const hasRecent = await checkRecentReportByCategory(user.id, categoryId, useX, useY);
          if (hasRecent) {
            AppAlert.alert(
              'Denuncia duplicada',
              'Ya has realizado una denuncia de esta categoría en esta ubicación recientemente, debes esperar 24 horas desde la creación de la anterior reporte para volver a reportar.',
              [{ text: 'Entendido', style: 'default' }]
            );
            setSubmitting(false);
            return;
          }
        } catch (err) {
// En caso de error en la verificación, permitir continuar para no bloquear al usuario
        }
      }

      // Sincronizar estado (no bloquea el envío)
      setCoords({ x: useX, y: useY });
      const res = await createReport({
        ciudadano_id: user.id,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        anonimo,
        ubicacion_texto: ubicacionTexto.trim() || null,
  coords_x: useX ?? null,
  coords_y: useY ?? null,
        categoria_publica_id: categoryId ?? null,
      });
      if (res.error) {
        RNAlert.alert('Error', 'No se pudo enviar la denuncia. Intenta de nuevo.');
      } else {
        // Subir evidencias si hay
        try {
          const inserted = (res.data as any[] | null)?.[0];
          const denunciaId = inserted?.id as string | undefined;
          if (denunciaId && attachments.length > 0) {
            // actualizar estado a 'uploading'
            setAttachments((prev) => prev.map((a)=> ({ ...a, status: 'uploading', tries: 0, progress: a.progress ?? 0 })));
            // subir en paralelo con progreso individual y reintentos
            const results = await Promise.all(attachments.map((a, i) => (
              uploadEvidenceForReportWithProgress(
                {
                  denunciaId,
                  usuarioId: user.id,
                  fileUri: a.uri,
                  kind: a.kind,
                  orden: i + 1,
                },
                (p) => {
                  setAttachments((prev) => prev.map((x, idx) => idx === i ? { ...x, progress: p } : x));
                }
              ).then((res) => {
                setAttachments((prev) => prev.map((x, idx) => idx === i ? { ...x, status: res.ok ? 'done' : 'error', tries: (res.tries ?? x.tries) } : x));
                return res;
              })
            )));
            const failed = results.filter(r => !r.ok).length;
            if (failed > 0) {
              AppAlert.alert('Aviso', `La denuncia se envió, pero ${failed} evidencia(s) no pudieron subirse. Puedes reintentar desde tu denuncia.`);
            }
          }
        } catch {}
        RNAlert.alert('Enviado', 'Tu denuncia ha sido enviada correctamente.');
        try { router.replace('/citizen/citizenReport'); } catch {}
        onClose?.();
      }
    } catch {
      RNAlert.alert('Error', 'Ocurrió un error al enviar.');
    } finally { setSubmitting(false); }
  };

  // Obtener ubicación automático al abrir el formulario
  useEffect(() => {
    // Si initialData proviene de editLocation (tiene ubicacionTexto o coords),
    // no debemos sobrescribirla con la ubicación del dispositivo. Solo pedir
    // la ubicación automática si no hay información previa.
    const hasInitialLocation = Boolean(initialData && (initialData.ubicacionTexto || (initialData.coords && (initialData.coords.x || initialData.coords.y))));
    if (hasInitialLocation) return;
    // intenta obtener ubicación sin necesidad de que el usuario presione
    // esto pedirá permiso la primera vez si no está otorgado
    (async () => { try { await handleUseCurrentLocation(); } catch {} })();
  }, [initialData]);

  // ===== Escalado
  const { height: windowH, width: windowW } = Dimensions.get('window');
  const BASE_W = 390, BASE_H = 844;
  const baseScale = Math.min(windowW / BASE_W, windowH / BASE_H);
  const ms = (size: number, f = 0.7) => PixelRatio.roundToNearestPixel(size + (size * baseScale - size) * f);

  const SAFE_TOP = insets.top + ms(8);
  const maxPanelHeight = Math.max(240, windowH - SAFE_TOP - 80);
  const TOP_OFFSET = Math.max(ms(32), Math.min(ms(96), (Math.max(0, maxPanelHeight - SAFE_TOP) * (windowW > windowH ? 0.06 : 0.10))));

  // Responsive measurements para footer
  const REPORT_BTN_W = Math.round(Math.min(140, Math.max(100, windowW * 0.34)));
  const LEFT_RESERVED_PADDING = REPORT_BTN_W + ms(24); // espacio reservado en el grupo izquierdo
  const MAX_BADGE_WIDTH = Math.round(windowW * 0.42);

  // Tamaño de fuente dinámico para el texto de ubicación (intentar que quepa sin cambiar botones)
  const locFontSize = ms(ubicacionTexto?.length > 120 ? 11 : ubicacionTexto?.length > 80 ? 12 : ubicacionTexto?.length > 50 ? 13 : 15);

  // ===== Scroll y refs
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollYRef = useRef(0);
  const titleRef = useRef<TextInput | null>(null);
  const descRef = useRef<TextInput | null>(null);

  // ===== Footer (altura real) y paddings
  const [footerH, setFooterH] = useState(0);
  // Sin espacio extra cuando el teclado está visible: el footer debe tocar el borde del teclado
  const bottomPadWhenKB = 0;
  const bottomPadNoKB = 6; // padding interno mínimo cuando no hay teclado
  // En iOS, usar kbH real. En Android, si el modo es 'pan' (la ventana no se reduce), usar kbH; si es 'resize', usar 0.
  const effKbInset = kbShown
    ? (Platform.OS === 'ios' ? kbH : (androidKbMode === 'pan' ? kbH : 0))
    : 0;
  const contentBottom = effKbInset + (kbShown ? bottomPadWhenKB : bottomPadNoKB) + footerH + ms(28);
  // Offset inferior del footer: cuando hay teclado, usar effKbInset; si no, usar insets.bottom
  const footerBottomOffset = kbShown ? effKbInset : (insets.bottom || 0);

  // ===== Cursor tracking para DESCRIPCIÓN =====
  // padding/border del TextInput (mantener sincronizado con estilos)
  const DESC_PAD = ms(14);
  const DESC_BORDER = 1;

  // ancho real del input (para medir wrapping)
  const [descInputW, setDescInputW] = useState(0);

  // selección/caret
  const [descSel, setDescSel] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  // altura del texto hasta el cursor (en un <Text> oculto con igual ancho/estilos)
  const [descCaretH, setDescCaretH] = useState(0);

  // bandera para no pelear con scroll manual
  const userScrollingRef = useRef(false);
  let userScrollTimer: ReturnType<typeof setTimeout> | null = null;
  const markScrolling = () => {
    userScrollingRef.current = true;
    if (userScrollTimer) clearTimeout(userScrollTimer);
    userScrollTimer = setTimeout(() => { userScrollingRef.current = false; }, 120);
  };

  // quién está enfocado
  const focusedRef = useRef<'title' | 'desc' | null>(null);

  // seguimiento por cursor: usa measureInWindow del input y descCaretH del texto medido
  const ensureVisibleByCaret = () => {
    if (!descRef.current || !scrollRef.current) return;

    descRef.current.measureInWindow?.((x, y, _w, _h) => {
      if (y == null) return;

      // bottom visible: ventana menos teclado y footer
      const visibleBottom = windowH - kbH - footerH - (kbH > 0 ? bottomPadWhenKB : bottomPadNoKB) - 6;
      const margin = 10;

      // posición del caret: top del input + borde + padding + altura del texto hasta el caret
      const caretBottom = y + DESC_BORDER + DESC_PAD + descCaretH;

      if (caretBottom > (visibleBottom - margin)) {
        const delta = caretBottom - (visibleBottom - margin);
        scrollRef.current?.scrollTo({ y: Math.max(0, scrollYRef.current + delta), animated: true });
      }
      // (opcional) si queda demasiado arriba, lo traemos un poco a la vista
      const minTop = SAFE_TOP + ms(16);
      const caretTop = caretBottom - ms(22); // aprox altura de línea
      if (caretTop < minTop) {
        const delta = minTop - caretTop;
        scrollRef.current?.scrollTo({ y: Math.max(0, scrollYRef.current - delta), animated: true });
      }
    });
  };

  const lastAutoTs = useRef(0);
  const autoEnsureCurrent = () => {
    if (!kbShown || userScrollingRef.current) return;
    const now = Date.now();
    if (now - lastAutoTs.current < 60) return;
    lastAutoTs.current = now;

    if (focusedRef.current === 'title') {
      // título: usa la lógica clásica de “borde del input”
      titleRef.current?.measureInWindow?.((_x, y, _w, h) => {
        if (y == null || h == null) return;
        const visibleBottom = windowH - kbH - footerH - (kbH > 0 ? bottomPadWhenKB : bottomPadNoKB) - 6;
        const margin = 12;
        const inputBottom = y + h;
        if (inputBottom > (visibleBottom - margin)) {
          const delta = inputBottom - (visibleBottom - margin);
          scrollRef.current?.scrollTo({ y: Math.max(0, scrollYRef.current + delta), animated: true });
        }
      });
    } else if (focusedRef.current === 'desc') {
      ensureVisibleByCaret();
    }
  };

  // ===== Obtener y mostrar dirección actual
  const handleUseCurrentLocation = async () => {
    try {
      // Verificar conexión (para geocodificación inversa y servicios de red)
      try {
        const st = await Network.getNetworkStateAsync();
        const connected = !!st.isConnected && st.isInternetReachable !== false;
        if (!connected) {
          AppAlert.alert('Sin conexión a la red', 'Por favor verifica tu conexión a internet.', [
            { text: 'Reintentar', onPress: () => handleUseCurrentLocation() },
            { text: 'Cancelar', style: 'cancel' },
          ]);
          return;
        }
      } catch {
        AppAlert.alert('Sin conexión a la red', 'Por favor verifica tu conexión a internet.', [
          { text: 'Reintentar', onPress: () => handleUseCurrentLocation() },
          { text: 'Cancelar', style: 'cancel' },
        ]);
        return;
      }
      const { requestForegroundPermissionsAsync, getCurrentPositionAsync, reverseGeocodeAsync } = await import('expo-location');
      const perm = await requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        AppAlert.alert('Ubicación', 'Permiso denegado para acceder a la ubicación.');
        return;
      }

      const loc = await getCurrentPositionAsync({ accuracy: 3 });
      setCoords({ x: Number(loc.coords.latitude.toFixed(4)), y: Number(loc.coords.longitude.toFixed(4)) });

      const places = await reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      const p = places?.[0] ?? null;
      if (!p) {
        setUbicacionTexto('Ubicación desconocida');
        return;
      }

      // Formateo avanzado: queremos "Calle Nombre 123, 800000 Ciudad, Región"
      // 1) Detectar número de casa/portal en `name` o al final de `street`.
      let streetRaw = (p.street || p.name || '').trim();
      let number = '';

      // Si `p.name` es solo número, usarlo como número
      if (p.name && /^\d+$/.test(String(p.name).trim())) {
        number = String(p.name).trim();
        streetRaw = (p.street || '').trim();
      } else {
        // Detectar número al final del `name` si `street` existe
        const mNameNum = String(p.name || '').trim().match(/(\d+)$/);
        if (mNameNum && p.street) {
          number = mNameNum[1];
          streetRaw = (p.street || '').trim();
        } else {
          // Si la street termina en número, separarlo
          const mStreetNum = streetRaw.match(/^(.*?)[,\s]+(\d+)\s*$/);
          if (mStreetNum) {
            streetRaw = (mStreetNum[1] || '').trim();
            number = mStreetNum[2] || '';
          }
        }
      }

      // Expandir abreviaturas comunes al inicio
      streetRaw = streetRaw
        .replace(/^\s*(Av\.?|Av)\s+/i, 'Avenida ')
        .replace(/^\s*(C\.?|Calle|C)\s+/i, 'Calle ')
        .replace(/^\s*(Pje\.?|Pje)\s+/i, 'Pasaje ')
        .replace(/^\s*(Gral\.?|Gral)\s+/i, 'General ')
        .replace(/^\s*(Bv\.?|Bvar\.?|Bulevar|Bulev)\s+/i, 'Bulevar ');

      const streetAndNumber = [streetRaw, number].filter(Boolean).join(' ').trim();
      const postalCity = [p.postalCode, p.city].filter(Boolean).join(' ');
      const region = p.region || '';

      const pretty = [streetAndNumber, postalCity, region].filter(Boolean).join(', ').trim();
      setUbicacionTexto(pretty || 'Mi ubicación');
    } catch (err) {
      AppAlert.alert('Ubicación', 'No se pudo obtener la ubicación. Intenta de nuevo.');
    }
  };

  // ===== Handlers unificados para cámara/galería
  const handleCameraPress = async () => {
    // Mostrar alert para elegir entre foto o video
    AppAlert.alert(
      '¿Qué deseas capturar?',
      'Elige el tipo de contenido',
      [
        { text: 'Foto', onPress: () => handleTakePhoto() },
        { text: 'Video', onPress: () => handleTakeVideo() },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const handleTakePhoto = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { AppAlert.alert('Cámara', 'Permiso denegado para usar la cámara'); return; }
      const r = await ImagePicker.launchCameraAsync({ 
        mediaTypes: 'images',
        cameraType: ImagePicker.CameraType.back,
        allowsEditing: false,
        quality: 0.8,
        exif: false,
      });
      if (r.canceled || !r.assets?.length) return;
      const asset = r.assets[0];
      const uri = asset.uri;
      setAttachments((prev) => [...prev, { uri, kind: 'FOTO', progress: 0, status: 'queued', tries: 0 }]);
    } catch (e) { AppAlert.alert('Cámara', 'No se pudo abrir la cámara'); }
  };

  const handleTakeVideo = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { AppAlert.alert('Cámara', 'Permiso denegado para usar la cámara'); return; }
      // Modo video explícitamente
      const r = await ImagePicker.launchCameraAsync({ 
        mediaTypes: 'videos', 
        videoMaxDuration: 60, 
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.High,
      });
      if (r.canceled || !r.assets?.length) return;
      const uri = r.assets[0].uri;
      setAttachments((prev) => [...prev, { uri, kind: 'VIDEO', progress: 0, status: 'queued', tries: 0 }]);
    } catch (e) { AppAlert.alert('Cámara', 'No se pudo abrir la cámara en modo video'); }
  };

  const handlePickFromGallery = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { AppAlert.alert('Galería', 'Permiso denegado para abrir la galería'); return; }
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'] });
      if (r.canceled || !r.assets?.length) return;
      const a = r.assets[0];
      const isVideo = (a.type === 'video') || /\.(mp4|mov|mkv|3gp)$/i.test(a.uri ?? '');
      setAttachments((prev) => [...prev, { uri: a.uri, kind: isVideo ? 'VIDEO' : 'FOTO', progress: 0, status: 'queued', tries: 0 }]);
    } catch (e) { AppAlert.alert('Galería', 'No se pudo abrir la galería'); }
  };

  // ===== Render
  return (
    <Modal visible transparent animationType="fade" hardwareAccelerated={Platform.OS === 'android'} statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1 }} onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        setRootH(h);
        if (!kbShown) baseRootHRef.current = h;
      }}>
        {/* overlay */}
        <View style={styles.overlayFull} />

        {/* Panel superior */}
  <View style={{ position: 'absolute', left: 0, right: 0, top: 0, maxHeight: maxPanelHeight, paddingTop: SAFE_TOP, alignItems: 'center', justifyContent: 'flex-start', borderRadius: 0, overflow: 'hidden', width: '100%' }}>
          {/* Navbar */}
          <View style={[styles.navbar, { paddingVertical: ms(8), paddingHorizontal: 6, marginTop: ms(12), width: '100%', borderRadius: 0 }]}> 
            <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: ms(120), flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => { if (typeof onBack === 'function') onBack(); else onClose?.(); }} style={{ padding: ms(10) }} accessibilityRole="button">
                  <IconSymbol name="arrow-left" size={ms(26)} color="#fff" />
                </TouchableOpacity>
                <View style={{ marginLeft: ms(8), width: ms(52), height: ms(52), borderRadius: ms(26), backgroundColor: '#0A4A90', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
                  {catLoading ? <ActivityIndicator size="small" color="#fff" /> : <IconSymbol name={(localCategory as any)?.icon ?? 'map-marker'} size={ms(24)} color="#fff" />}
                </View>
              </View>

              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: ms(8) }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: ms(18) }} numberOfLines={1} ellipsizeMode="tail">
                  {localCategory?.nombre ?? ''}
                </Text>
              </View>

              <View style={{ width: ms(56), alignItems: 'flex-end' }}>
                <TouchableOpacity onPress={() => onClose?.()} style={{ padding: ms(10) }} accessibilityRole="button">
                  <IconSymbol name="close" size={ms(26)} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Contenido */}
          <ScrollView
            ref={scrollRef}
            style={{ width: '100%' }}
            contentContainerStyle={{ paddingHorizontal: ms(12), paddingBottom: contentBottom, flexGrow: 1, justifyContent: 'flex-start' }}
            onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
            onScrollBeginDrag={markScrolling}
            onScrollEndDrag={markScrolling}
            onMomentumScrollBegin={markScrolling}
            onMomentumScrollEnd={markScrolling}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <View style={{ height: TOP_OFFSET }} />

            <View style={{ marginBottom: ms(8), padding: 8, backgroundColor: 'transparent' }}>
              <Text style={{ color: '#ffffff', fontSize: ms(23), fontWeight: '600', marginBottom: ms(6), letterSpacing: 0.3 }}>
                Solo el hecho principal
              </Text>
              <TextInput
                ref={titleRef}
                placeholder="Título (breve)"
                placeholderTextColor={'rgba(255,255,255,0.95)'}
                value={titulo}
                onFocus={() => { focusedRef.current = 'title'; requestAnimationFrame(() => autoEnsureCurrent()); }}
                onBlur={() => { if (focusedRef.current === 'title') focusedRef.current = null; }}
                onChangeText={(t) => { setTitulo(t); autoEnsureCurrent(); }}
                onSelectionChange={() => autoEnsureCurrent()}
                onContentSizeChange={() => autoEnsureCurrent()}
                maxLength={160}
                style={{ color: '#fff', fontWeight: '900', fontSize: ms(25), backgroundColor: 'transparent', borderWidth: 0, paddingVertical: ms(10), marginBottom: ms(6), lineHeight: Math.round(ms(30)) }}
              />

              <Text style={{ color: '#fff', opacity: 0.98, marginBottom: ms(10), fontSize: ms(21), fontWeight: '700' }}>
                ¿Qué está pasando?
              </Text>

              <View
                // contenedor para medir el ancho real del TextInput
                onLayout={(e) => { setDescInputW(Math.round(e.nativeEvent.layout.width)); }}
                style={{ width: '100%' }}
              >
                <TextInput
                  ref={descRef}
                  placeholder="Describe lo que sucede"
                  placeholderTextColor={'rgba(255,255,255,0.9)'}
                  value={descripcion}
                  onFocus={() => { focusedRef.current = 'desc'; requestAnimationFrame(() => autoEnsureCurrent()); }}
                  onBlur={() => { if (focusedRef.current === 'desc') focusedRef.current = null; }}
                  onChangeText={(t) => { 
                    // Limitar a 1000 caracteres
                    if (t.length <= 1000) {
                      setDescripcion(t); 
                      autoEnsureCurrent(); 
                    }
                  }}
                  onSelectionChange={(e) => { setDescSel(e.nativeEvent.selection); autoEnsureCurrent(); }}
                  onContentSizeChange={() => { autoEnsureCurrent(); }}
                  maxLength={1000}
                  style={{
                    color: '#fff',
                    backgroundColor: 'transparent',
                    borderWidth: DESC_BORDER,
                    borderColor: 'rgba(255,255,255,0.16)',
                    borderRadius: 12,
                    padding: DESC_PAD,
                    minHeight: Math.max(160, ms(180)),
                    textAlignVertical: 'top',
                    marginBottom: ms(6),
                    fontSize: ms(18),
                    lineHeight: Math.round(ms(24)),
                  }}
                  multiline
                />

                {/* Contador de caracteres */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: ms(12) }}>
                  <Text style={{ 
                    color: descripcion.length >= 1000 ? '#EF4444' : 'rgba(255,255,255,0.6)', 
                    fontSize: ms(12), 
                    fontWeight: '600' 
                  }}>
                    {descripcion.length >= 1000 ? 'Límite alcanzado' : `${descripcion.length}/1000 caracteres`}
                  </Text>
                  {descripcion.length > 0 && descripcion.length < 30 && (
                    <Text style={{ 
                      color: '#FCD34D', 
                      fontSize: ms(12), 
                      fontWeight: '600' 
                    }}>
                      Mínimo 30 caracteres
                    </Text>
                  )}
                </View>

                {/* --- Medidor oculto para calcular altura hasta el cursor --- */}
                <View style={{ position: 'absolute', left: -9999, top: -9999, width: Math.max(0, descInputW - DESC_PAD * 2) }}>
                  <Text
                    // mismo estilo de texto (sin padding ni borde)
                    style={{ color: 'transparent', fontSize: ms(18), lineHeight: Math.round(ms(24)) }}
                    onLayout={(e) => { setDescCaretH(Math.round(e.nativeEvent.layout.height)); }}
                  >
                    {/* texto hasta el caret; si está vacío, un espacio para dar altura 1 línea */}
                    {descripcion.slice(0, Math.max(0, descSel.start)) || ' '}
                  </Text>
                </View>
              </View>

              {/* Previsualización de adjuntos: mover aquí arriba del footer */}
              {attachments.length > 0 && (
                <View style={{ marginTop: ms(12), marginBottom: ms(8) }}>
                  <Text style={{ color: '#fff', fontSize: ms(15), fontWeight: '600', marginBottom: ms(8) }}>
                    Evidencias adjuntas
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
                    {attachments.map((a, idx) => (
                      <View key={idx} style={{ marginRight: 12, position: 'relative' }}>
                        {a.kind === 'FOTO' ? (
                          <Image source={{ uri: a.uri }} style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#ffffff' }} />
                        ) : (
                          <View style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
                            <IconSymbol name="play-circle" size={32} color="#0A4A90" />
                          </View>
                        )}
                        {/* Barra de progreso durante subida */}
                        {a.status !== 'queued' && a.status !== 'done' && (
                          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, backgroundColor: 'rgba(10,74,144,0.25)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                            <View style={{ width: `${Math.round((a.progress || 0)*100)}%`, height: '100%', backgroundColor: '#0A4A90', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }} />
                          </View>
                        )}
                        {/* Estado error y botón de reintento */}
                        {a.status === 'error' && (
                          <TouchableOpacity
                            onPress={() => {
                              setAttachments((prev) => prev.map((x,i)=> i===idx ? { ...x, status: 'queued', progress: 0 } : x));
                            }}
                            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 20, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}
                          >
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Reintentar</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#0A4A90', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        >
                          <IconSymbol name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Footer (medimos alto real) */}
        <View
          onLayout={(e) => setFooterH(Math.max(0, Math.round(e.nativeEvent.layout.height)))}
          style={[styles.footerAbsolute, { bottom: footerBottomOffset, paddingBottom: kbShown ? bottomPadWhenKB : bottomPadNoKB }]}
        >
          <View style={styles.footerTopRowInner}>
            {/* Botón de cámara - abre alert para elegir foto/video */}
            <TouchableOpacity
              style={styles.footerCircleBtn}
              onPress={handleCameraPress}
            >
              <IconSymbol name="camera" size={20} color="#0A4A90" />
            </TouchableOpacity>

            {/* Botón para galería (foto o video) */}
            <TouchableOpacity
              style={styles.footerCircleBtn}
              onPress={handlePickFromGallery}
            >
              <IconSymbol name="image" size={20} color="#0A4A90" />
            </TouchableOpacity>

            {/* Botón de dirección */}
            <TouchableOpacity
              style={styles.footerLocationBtnFull}
              onPress={() => {
                try {
                  const lat = coords.x ?? '';
                  const lng = coords.y ?? '';
                  const addr = encodeURIComponent(ubicacionTexto ?? '');
                  try { setReportFormSnapshot({ titulo, descripcion, anonimo, ubicacionTexto, coords, categoryId }); } catch {}
                  setLocationEditCallback(({ ubicacionTexto: u, coords: c }) => {
                    setUbicacionTexto(u ?? '');
                    setCoords(c ?? {});
                  });
                  try { onClose?.(); } catch {}
                  setTimeout(() => {
                    try { router.push((`/features/report/components/editLocation?lat=${lat}&lng=${lng}&addr=${addr}`) as any); } catch (e) {  }
                  }, 120);
                } catch (e) {  }
              }}
            >
              <IconSymbol name="map-marker" size={20} color="#0A4A90" style={{ marginRight: 8 }} />
              <Text style={[styles.footerLocationTextFull, { fontSize: locFontSize }]} numberOfLines={4} ellipsizeMode="tail">
                {ubicacionTexto?.trim() ? ubicacionTexto : 'Obteniendo ubicación…'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 1, backgroundColor: '#fff', width: '100%', marginVertical: 8 }} />

          <View style={styles.footerBottomRowFull}>
            <View style={[styles.leftFooterGroup, { paddingRight: LEFT_RESERVED_PADDING }] }>
                <TouchableOpacity
                style={[styles.anonFooterBtnFull, anonimo ? styles.anonFooterBtnActive : styles.anonFooterBtnInactive]}
                onPress={() => setAnonimo(v => !v)}
              >
                <IconSymbol name="user-secret" size={20} color={anonimo ? '#0A4A90' : 'rgba(10,74,144,0.28)'} />
              </TouchableOpacity>
                {anonimo ? (
                  <View style={[styles.anonymousBadge, { maxWidth: MAX_BADGE_WIDTH }]}>
                    <Text style={styles.anonymousBadgeTxt} numberOfLines={1} ellipsizeMode="tail">Reporte Anónimo</Text>
                  </View>
                ) : null}
            </View>

            <TouchableOpacity style={[styles.reportFooterBtnFull, { width: REPORT_BTN_W }]} onPress={handleSubmit} disabled={submitting}>
              <IconSymbol name="send" size={18} color="#0A4A90" style={{ marginRight: 8 }} />
              <Text style={styles.reportFooterTxtFull}>{submitting ? 'Enviando…' : 'Reportar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayFull: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)' },
  navbar: { width: '100%', backgroundColor: '#0A4A90', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  footerAbsolute: { position: 'absolute', left: 0, right: 0, backgroundColor: '#0A4A90', paddingHorizontal: 12, paddingTop: 8 },
  footerTopRowInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  footerCircleBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  footerLocationTextFull: { color: '#0A4A90', fontSize: 15, flexShrink: 1, textAlign: 'left' },
  footerBottomRowFull: { position: 'relative', flexDirection: 'row', alignItems: 'center', marginTop: 0, height: 56 },
  anonFooterBtnFull: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  anonFooterBtnActive: { backgroundColor: '#fff', borderWidth: 0, shadowColor: '#0A4A90', shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  anonFooterBtnInactive: { backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 0, borderColor: 'rgba(10,74,144,0.06)' },
  
  reportFooterTxtFull: { color: '#0A4A90', fontWeight: '700', fontSize: 16 },
  leftFooterGroup: { position: 'relative', flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 200 },
  anonymousBadge: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, minHeight: 40, justifyContent: 'center', marginLeft: 1, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  anonymousBadgeTxt: { color: '#0A4A90', fontWeight: '700', fontSize: 14 },
  footerLocationBtnFull: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  reportFooterBtnFull: { position: 'absolute', right: 12, top: '50%', width: 140, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 8, height: 52, paddingHorizontal: 12, zIndex: 20, transform: [{ translateY: -26 }] },
});
