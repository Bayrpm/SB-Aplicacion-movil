import { useAuth } from '@/app/features/auth/context';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
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
import { createReport } from '../api/report.api';
import { useReportModal } from '../context';
import { useReportCategories } from '../hooks/useReportCategories';
import type { ReportCategory } from '../types';

type Props = { onClose?: () => void; categoryId?: number; onBack?: () => void; };
type TIRef = React.RefObject<TextInput | null>;

export default function ReportForm({ onClose, categoryId, onBack }: Props) {
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

  const [coords, setCoords] = useState<{ x?: number; y?: number }>({});
  const [submitting, setSubmitting] = useState(false);

  // ===== Teclado
  const [kbH, setKbH] = useState(0);
  const [kbShown, setKbShown] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(showEvt as any, (e: any) => {
      setKbShown(true);
      setKbH(e?.endCoordinates?.height ?? 0);
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
  useEffect(() => {
    (async () => {
      try {
        const loc = await (await import('expo-location')).getCurrentPositionAsync({});
        setCoords({ x: Number(loc.coords.latitude.toFixed(4)), y: Number(loc.coords.longitude.toFixed(4)) });
      } catch {}
    })();
  }, []);

  const handleSubmit = async () => {
    if (!user?.id) { RNAlert.alert('Debes iniciar sesión', 'Inicia sesión para enviar una denuncia.'); return; }
    if (!titulo.trim() || !descripcion.trim()) { RNAlert.alert('Campos incompletos', 'Por favor ingresa título y descripción.'); return; }

    setSubmitting(true);
    try {
      if (ubicacionTexto.trim() && (!coords.x || !coords.y)) {
        try {
          const { geocodeAsync } = await import('expo-location');
          const results = await geocodeAsync(ubicacionTexto.trim());
          if (results?.[0]?.latitude != null && results?.[0]?.longitude != null) {
            setCoords({ x: Number(results[0].latitude.toFixed(4)), y: Number(results[0].longitude.toFixed(4)) });
          }
        } catch {}
      }
      if (!coords.x || !coords.y) {
        try {
          const loc = await (await import('expo-location')).getCurrentPositionAsync({});
          if (loc?.coords?.latitude != null && loc?.coords?.longitude != null) {
            setCoords({ x: Number(loc.coords.latitude.toFixed(4)), y: Number(loc.coords.longitude.toFixed(4)) });
          }
        } catch {}
      }
      const res = await createReport({
        ciudadano_id: user.id,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        anonimo,
        ubicacion_texto: ubicacionTexto.trim() || null,
        coords_x: coords.x ?? null,
        coords_y: coords.y ?? null,
        categoria_publica_id: categoryId ?? null,
      });
  if (res.error) { RNAlert.alert('Error', 'No se pudo enviar la denuncia. Intenta de nuevo.'); }
  else { RNAlert.alert('Enviado', 'Tu denuncia ha sido enviada correctamente.'); try { router.replace('/citizen/citizenReport'); } catch {} onClose?.(); }
    } catch {
      RNAlert.alert('Error', 'Ocurrió un error al enviar.');
    } finally { setSubmitting(false); }
  };

  // ===== Escalado
  const { height: windowH, width: windowW } = Dimensions.get('window');
  const BASE_W = 390, BASE_H = 844;
  const baseScale = Math.min(windowW / BASE_W, windowH / BASE_H);
  const ms = (size: number, f = 0.7) => PixelRatio.roundToNearestPixel(size + (size * baseScale - size) * f);

  const SAFE_TOP = insets.top + ms(8);
  const maxPanelHeight = Math.max(240, windowH - SAFE_TOP - 80);
  const TOP_OFFSET = Math.max(ms(32), Math.min(ms(96), (Math.max(0, maxPanelHeight - SAFE_TOP) * (windowW > windowH ? 0.06 : 0.10))));

  // ===== Scroll y refs
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollYRef = useRef(0);
  const titleRef = useRef<TextInput | null>(null);
  const descRef = useRef<TextInput | null>(null);

  // ===== Footer (altura real) y paddings
  const [footerH, setFooterH] = useState(0);
  const bottomPadWhenKB = 6;
  const bottomPadNoKB = 6; // fixed small padding inside footer; footerBottomOffset keeps it above system nav
  const contentBottom = (kbH > 0 ? kbH : bottomPadNoKB) + footerH + ms(28);
  // footer offset from bottom: siempre encima de la barra del sistema
  const footerBottomOffset = (kbH > 0 ? kbH : 0) + (insets.bottom || 12);

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

  // ===== Render
  return (
    <Modal visible transparent animationType="fade" hardwareAccelerated={Platform.OS === 'android'} statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        {/* overlay */}
        <View style={styles.overlayFull} />

        {/* Panel superior */}
        <View style={{ position: 'absolute', left: '4%', right: '4%', top: 0, maxHeight: maxPanelHeight, paddingTop: SAFE_TOP, alignItems: 'center', justifyContent: 'flex-start', borderRadius: 12, overflow: 'hidden' }}>
          {/* Navbar */}
          <View style={[styles.navbar, { paddingVertical: ms(8), paddingHorizontal: 6, marginTop: ms(12) }]}>
            <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: ms(120), flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => { if (typeof onBack === 'function') onBack(); else onClose?.(); }} style={{ padding: ms(10) }} accessibilityRole="button">
                  <MaterialCommunityIcons name="arrow-left" size={ms(26)} color="#fff" />
                </TouchableOpacity>
                <View style={{ marginLeft: ms(8), width: ms(52), height: ms(52), borderRadius: ms(26), backgroundColor: '#0A4A90', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
                  {catLoading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name={(localCategory as any)?.icon ?? 'map-marker'} size={ms(24)} color="#fff" />}
                </View>
              </View>

              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: ms(8) }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: ms(18) }} numberOfLines={1} ellipsizeMode="tail">
                  {localCategory?.nombre ?? ''}
                </Text>
              </View>

              <View style={{ width: ms(56), alignItems: 'flex-end' }}>
                <TouchableOpacity onPress={() => onClose?.()} style={{ padding: ms(10) }} accessibilityRole="button">
                  <MaterialCommunityIcons name="close" size={ms(26)} color="#fff" />
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
                  onChangeText={(t) => { setDescripcion(t); autoEnsureCurrent(); }}
                  onSelectionChange={(e) => { setDescSel(e.nativeEvent.selection); autoEnsureCurrent(); }}
                  onContentSizeChange={() => { autoEnsureCurrent(); }}
                  style={{
                    color: '#fff',
                    backgroundColor: 'transparent',
                    borderWidth: DESC_BORDER,
                    borderColor: 'rgba(255,255,255,0.16)',
                    borderRadius: 12,
                    padding: DESC_PAD,
                    minHeight: Math.max(160, ms(180)),
                    textAlignVertical: 'top',
                    marginBottom: ms(12),
                    fontSize: ms(18),
                    lineHeight: Math.round(ms(24)),
                  }}
                  multiline
                />

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
            </View>
          </ScrollView>
        </View>

        {/* Footer (medimos alto real) */}
        <View
          onLayout={(e) => setFooterH(Math.max(0, Math.round(e.nativeEvent.layout.height)))}
          style={[styles.footerAbsolute, { bottom: footerBottomOffset, paddingBottom: kbH > 0 ? bottomPadWhenKB : bottomPadNoKB }]}
        >
          <View style={styles.footerTopRowInner}>
            <TouchableOpacity style={styles.footerCircleBtn} onPress={() => AppAlert.alert('Próximamente', 'Función de cámara disponible próximamente')}>
              <MaterialCommunityIcons name="camera" size={20} color="#0A4A90" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerCircleBtn} onPress={() => AppAlert.alert('Próximamente', 'Función de selección de foto disponible próximamente')}>
              <MaterialCommunityIcons name="image" size={20} color="#0A4A90" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerLocationBtnFull} onPress={() => setUbicacionTexto(s => (s?.trim() ? s : 'Ubicación actual'))}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#0A4A90" style={{ marginRight: 8 }} />
              <Text style={styles.footerLocationTextFull} numberOfLines={1} ellipsizeMode="tail">
                {ubicacionTexto?.trim() ? ubicacionTexto : 'Ubicación actual'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 1, backgroundColor: '#fff', width: '100%', marginVertical: 8 }} />

          <View style={styles.footerBottomRowFull}>
            <View style={styles.leftFooterGroup}>
              <TouchableOpacity
                style={[styles.anonFooterBtnFull, anonimo ? styles.anonFooterBtnActive : styles.anonFooterBtnInactive]}
                onPress={() => setAnonimo(v => !v)}
              >
                <FontAwesome5 name="user-secret" solid size={20} color={anonimo ? '#0A4A90' : 'rgba(10,74,144,0.28)'} />
              </TouchableOpacity>
                {anonimo ? (
                  <View style={styles.anonymousBadge}>
                    <Text style={styles.anonymousBadgeTxt} numberOfLines={1} ellipsizeMode="tail">Reporte Anónimo</Text>
                  </View>
                ) : null}
            </View>

            <TouchableOpacity style={styles.reportFooterBtnFull} onPress={handleSubmit} disabled={submitting}>
              <MaterialCommunityIcons name="send" size={18} color="#0A4A90" style={{ marginRight: 8 }} />
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

  footerAbsolute: { position: 'absolute', left: 0, right: 0, backgroundColor: '#0A4A90', paddingHorizontal: 12, paddingTop: 6 },
  footerTopRowInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  footerCircleBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  footerLocationBtnFull: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, height: 48 },
  footerLocationTextFull: { color: '#0A4A90', fontSize: 14, flexShrink: 1, textAlign: 'right' },
  footerBottomRowFull: { position: 'relative', flexDirection: 'row', alignItems: 'center', marginTop: 0, height: 48 },
  anonFooterBtnFull: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  anonFooterBtnActive: { backgroundColor: '#fff', borderWidth: 0, shadowColor: '#0A4A90', shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  anonFooterBtnInactive: { backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 0, borderColor: 'rgba(10,74,144,0.06)' },
  
  reportFooterTxtFull: { color: '#0A4A90', fontWeight: '700', fontSize: 16 },
  leftFooterGroup: { position: 'relative', flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 180 },
  anonymousBadge: { backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 14, width: 120, minHeight: 36, justifyContent: 'center', marginLeft: 2, zIndex: 5, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  anonymousBadgeTxt: { color: '#003366', fontSize: 13, fontWeight: '800', flexShrink: 0, includeFontPadding: true, textAlign: 'left', lineHeight: 18 },
  reportFooterBtnFull: { position: 'absolute', right: 12, top: '50%', width: 130, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 8, height: 44, paddingHorizontal: 12, zIndex: 20, transform: [{ translateY: -22 }] },
});
