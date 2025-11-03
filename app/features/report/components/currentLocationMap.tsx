import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getMapStyle } from '../lib/mapStyles';
// usamos IconSymbol centralizado en lugar de importar familias directamente
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, PixelRatio, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
// view-shot para capturar la vista del CategoryPin como imagen nativa
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { Button } from '../../../../components/Button';
import { IconSymbol } from '../../../../components/ui/icon-symbol';
import { fetchPublicReports } from '../api/report.api';
import { useReportModal } from '../context';
import CategoryPin from './CategoryPin';
import ReportDetailModal from './reportDetailModal';
// ======== UI scale ========
const DPR = PixelRatio.get();
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SCALE = Math.min(Math.max(SCREEN_W / 360, 0.85), 1.25);
const COMPASS_SIZE = Math.round(64 * SCALE);
const COMPASS_ICON_SIZE = Math.round(28 * SCALE);
const FAB_SIZE = Math.round(56 * SCALE);
const FAB_ICON_SIZE = Math.round(28 * SCALE);
const WRAP_OFFSET = Math.round(SCALE * (DPR >= 3 ? 6 : 4));
const EO_OFFSET = -Math.round(COMPASS_SIZE * 0.045);
const NS_ARROW_SIZE = Math.max(12, Math.round(COMPASS_SIZE * 0.22));
const EO_ARROW_SIZE = NS_ARROW_SIZE;
const DIAG_HEIGHT = Math.max(4, Math.round(COMPASS_SIZE * 0.09));
const DIAG_OFFSET = Math.max(4, Math.round(COMPASS_SIZE * 0.125));
// Dimensiones del pin y su wrapper para evitar recortes
const PIN_SIZE = 56;        // diámetro del círculo
const PIN_TIP_H = 12;       // altura de la punta
const MARKER_WRAPPER_W = 112; // wrapper amplio para que no recorte
const MARKER_WRAPPER_H = 140;
// Separador seguro para componer claves de snapshot (iconName y count)
const SNAP_KEY_SEP = '__COUNT__';

// ======== Map behavior tunables (clave) ========
// Umbral de píxeles para considerar "centrado"
const CENTER_PX_THRESHOLD = Math.max(3, Math.round(4 * SCALE));
const ROT_EPS_DEG = 0.5;
const TARGET_ZOOM = 16;
const TARGET_LAT_DELTA = 0.0015;
const TARGET_LON_DELTA = 0.0015;
// Zoom a partir del cual cambiamos de agrupado -> individual
const ZOOM_CLUSTER_BREAK = 18.5;


const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  map: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fabContainer: { position: 'absolute', right: 24, bottom: 32, alignItems: 'center', zIndex: 10 },
  networkErrorContainer: {
    position: 'absolute',
    top: '35%',
    left: 20,
    right: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  networkErrorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  networkErrorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0A4A90',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  compassFab: {
    marginBottom: Math.round(12 * SCALE),
    width: COMPASS_SIZE, height: COMPASS_SIZE, borderRadius: Math.round(COMPASS_SIZE / 2),
    backgroundColor: '#0A4A90', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5, overflow: 'visible',
  },
  fab: { width: FAB_SIZE, height: FAB_SIZE, borderRadius: Math.round(FAB_SIZE / 2), backgroundColor: '#0A4A90', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 4 },
  compassContent: { alignItems: 'center', justifyContent: 'center', width: COMPASS_SIZE, height: COMPASS_SIZE, overflow: 'visible' },
  compassLabels: { position: 'absolute', left: 0, top: 0, width: COMPASS_SIZE, height: COMPASS_SIZE, alignItems: 'center', justifyContent: 'center', zIndex: 80 },
  labelWrapper: { position: 'absolute', width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  arrow: { zIndex: 90, margin: 0 },
  line: { zIndex: 85 },
  diag: { width: Math.max(2, Math.round(COMPASS_SIZE * 0.03)), height: DIAG_HEIGHT, backgroundColor: '#fff', position: 'absolute', zIndex: 85, borderRadius: 2 },
  diagNE: { right: DIAG_OFFSET, top: Math.round(COMPASS_SIZE * 0.09), transform: [{ rotate: '45deg' }] },
  diagSE: { right: DIAG_OFFSET, bottom: Math.round(COMPASS_SIZE * 0.09), transform: [{ rotate: '135deg' }] },
  diagSO: { left: DIAG_OFFSET, bottom: Math.round(COMPASS_SIZE * 0.09), transform: [{ rotate: '-135deg' }] },
  diagNO: { left: DIAG_OFFSET, top: Math.round(COMPASS_SIZE * 0.09), transform: [{ rotate: '-45deg' }] },
  compassLabel: { color: '#fff', fontWeight: 'bold', fontSize: Math.max(10, Math.round(COMPASS_SIZE * 0.17)), textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  north: { top: 10, left: 28 }, south: { bottom: 10, left: 28 }, east: { top: 28, right: 10 }, west: { top: 28, left: 10 },
  northWrapper: { position: 'absolute', top: Math.round(COMPASS_SIZE * 0.06), left: 0, right: 0, alignItems: 'center' },
  neWrapper: { position: 'absolute', top: Math.round(COMPASS_SIZE * 0.16), right: WRAP_OFFSET, alignItems: 'center' },
  eastWrapper: { position: 'absolute', right: Math.round(COMPASS_SIZE * 0.12), top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  seWrapper: { position: 'absolute', bottom: Math.round(COMPASS_SIZE * 0.16), right: WRAP_OFFSET, alignItems: 'center' },
  southWrapper: { position: 'absolute', bottom: Math.round(COMPASS_SIZE * 0.06), left: 0, right: 0, alignItems: 'center' },
  soWrapper: { position: 'absolute', bottom: Math.round(COMPASS_SIZE * 0.16), left: WRAP_OFFSET, alignItems: 'center' },
  westWrapper: { position: 'absolute', left: Math.round(COMPASS_SIZE * 0.12), top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  noWrapper: { position: 'absolute', top: Math.round(COMPASS_SIZE * 0.16), left: WRAP_OFFSET, alignItems: 'center' },
  vertCenter: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  horzCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  horzCenterReverse: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center' },
  northLabel: {}, eastLabel: {}, southLabel: {}, westLabel: {},
  northLabelNudge: { transform: [{ translateY: 1 }] },
  southLabelNudge: { transform: [{ translateY: -1 }] },
  arrowNorth: { marginBottom: 0, transform: [{ rotate: '0deg' }] },
  arrowSouth: { marginTop: 0, transform: [{ rotate: '180deg' }] },
  arrowEast: { marginLeft: 4, transform: [{ rotate: '90deg' }] },
  arrowWest: { marginRight: 4, transform: [{ rotate: '-90deg' }] },
  arrowAbsolute: { position: 'absolute', zIndex: 110, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4, shadowRadius: 1 },
  arrowNorthAbs: { top: Math.round(-COMPASS_SIZE * 0.09), alignSelf: 'center' },
  arrowSouthAbs: { bottom: Math.round(-COMPASS_SIZE * 0.09), alignSelf: 'center', transform: [{ rotate: '180deg' }] },
  arrowEastAbs: { right: EO_OFFSET, alignSelf: 'center', transform: [{ rotate: '90deg' }], zIndex: 95 },
  arrowWestAbs: { left: EO_OFFSET, alignSelf: 'center', transform: [{ rotate: '-90deg' }], zIndex: 95 },
  arrowEOContainer: { position: 'absolute', top: 0, width: COMPASS_SIZE, height: COMPASS_SIZE, alignItems: 'center', justifyContent: 'center', zIndex: 120, overflow: 'visible' },
  arrowEO: { position: 'absolute', zIndex: 121, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4, shadowRadius: 1 },
  arrowEastEO: { right: EO_OFFSET, transform: [{ rotate: '90deg' }] },
  arrowWestEO: { left: EO_OFFSET, transform: [{ rotate: '-90deg' }] },
  markerWrapper: {
    height: MARKER_WRAPPER_H,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  pinContainer: {
    width: PIN_SIZE,
  },
  pinHead: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    backgroundColor: '#FF3B30',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: Math.max(8, Math.round(PIN_SIZE * 0.18)),
    borderRightWidth: Math.max(8, Math.round(PIN_SIZE * 0.18)),
    borderTopWidth: PIN_TIP_H,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FF3B30',
    marginTop: -2,
  },
});



export default function CurrentLocationMap() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const { reportDetailId, setReportDetailId } = useReportModal();
  
  const mapStyle = React.useMemo(() => getMapStyle(scheme), [scheme]);
  
  const navBarHeightAndroid = Platform.OS === 'android'
    ? Math.max(0, Dimensions.get('screen').height - Dimensions.get('window').height)
    : 0;
  const bottomOverlayHeight = Math.max(insets.bottom || 0, navBarHeightAndroid || 0);
  const TAB_BAR_BASE = 72;
  const tabBarHeightLocal = TAB_BAR_BASE + bottomOverlayHeight;

  // ======== Estado de denuncias públicas ========
    const [publicReports, setPublicReports] = useState<Array<{
      id: string;
      titulo: string;
      descripcion: string;
      coords_x: number;
      coords_y: number;
      categoria_publica_id: number | null;
      fecha_creacion: string;
      ubicacion_texto: string | null;
    }>>([]);
  const [freezeMarkers, setFreezeMarkers] = useState(false);
  const markersLoadedRef = useRef(false);
  const [networkError, setNetworkError] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  
  // ======== Modal de detalle de denuncia ========
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ======== Estado brújula/rotación (tu lógica original) ========
  const [mapRotation, setMapRotation] = useState(0);
  const [cardinal, setCardinal] = useState<'N' | 'NE' | 'E' | 'SE' | 'S' | 'SO' | 'O' | 'NO'>('N');
  const animatedRotationRef = useRef<Animated.Value>(new Animated.Value(0));
  const animatedAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const angleRef = useRef<number>(0);
  const lastRenderRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const isPanningRef = useRef(false);

  // ======== Seguimiento y centrado ========
  const [isCentered, setIsCentered] = useState(true);
  const [isFollowing, setIsFollowing] = useState(true);
  const isFollowingRef = useRef(true);

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const mapReadyRef = useRef(false);
  const mapLayoutRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const [mapZoom, setMapZoom] = useState<number | null>(null);

  const initialCenteredRef = useRef(false);
  const isCenteringRef = useRef(false);
  const LAST_CENTERED_AT = useRef<number | null>(null);

  const userGestureRef = useRef(false);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  const fabBottomOffset = 24 + Math.max(0, insets.bottom);
  const fabBottomAboveTab = tabBarHeightLocal + 16;

  // ======== Manejo de deep links para abrir modal de detalle ========
  useEffect(() => {
    if (reportDetailId) {
      // Abrir el modal con el reporte específico
      setSelectedReportIds([reportDetailId]);
      setShowDetailModal(true);
      // Limpiar el ID del contexto después de usarlo
      setReportDetailId(null);
    }
  }, [reportDetailId, setReportDetailId]);

  // ======== Utilidades ========
  const computeCardinal = (heading: number) => {
    const h = ((heading % 360) + 360) % 360;
    const sector = Math.round(h / 45) % 8;
    return (['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const)[sector];
  };

  const readCameraHeading = async () => {
    try {
      if (mapRef.current && (mapRef.current as any).getCamera) {
        const cam = await (mapRef.current as any).getCamera();
        const heading = cam?.heading ?? 0;
        const prev = angleRef.current || 0;
        const targetN = ((heading % 360) + 360) % 360;
        let delta = targetN - (((prev % 360) + 360) % 360);
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        const next = prev + delta * 0.28;
        angleRef.current = next;

        if (animatedAnimRef.current) { try { animatedAnimRef.current.stop(); } catch {} animatedAnimRef.current = null; }
        const anim = Animated.timing(animatedRotationRef.current, { toValue: next, duration: 120, easing: Easing.linear, useNativeDriver: true });
        animatedAnimRef.current = anim;
        anim.start(() => { if (animatedAnimRef.current === anim) animatedAnimRef.current = null; });

        const now = Date.now();
        if (now - (lastRenderRef.current || 0) > 80 || Math.abs(next - (mapRotation || 0)) > 2) {
          lastRenderRef.current = now;
          setMapRotation(next);
        }
      }
    } catch {}
  };

  useEffect(() => { setCardinal(computeCardinal(((mapRotation % 360) + 360) % 360)); }, [mapRotation]);
  useEffect(() => { setCardinal(computeCardinal(0)); }, []);

  const rafLoop = () => {
    if (!isPanningRef.current) return;
    const now = Date.now();
    if (now - (lastUpdateRef.current || 0) >= 100) {
      lastUpdateRef.current = now;
      void readCameraHeading();
    }
    rafRef.current = requestAnimationFrame(rafLoop);
  };
  const startRaf = () => { if (isPanningRef.current) return; isPanningRef.current = true; if (rafRef.current == null) rafRef.current = requestAnimationFrame(rafLoop); };
  const stopRaf  = () => { isPanningRef.current = false; if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };

  const resetCompass = () => {
    stopRaf();
    if (animatedAnimRef.current) { try { animatedAnimRef.current.stop(); } catch {} animatedAnimRef.current = null; }
    const current = angleRef.current || 0;
    const currentMod = ((current % 360) + 360) % 360;
    let delta = -currentMod; if (delta > 180) delta -= 360; if (delta < -180) delta += 360;
    const target = current + delta;
    angleRef.current = target;
    const anim = Animated.timing(animatedRotationRef.current, { toValue: target, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animatedAnimRef.current = anim;
    anim.start(() => { angleRef.current = 0; try { animatedRotationRef.current.setValue(0); } catch {} setMapRotation(0); setCardinal('N'); animatedAnimRef.current = null; });
  };

  // ======== Core: centrado por PÍXELES ========
  const updateCenteredByPixels = async () => {
    try {
      if (!mapRef.current || !location) return;
      const anyMap: any = mapRef.current;
      const cx = mapLayoutRef.current.width / 2;
      const cy = mapLayoutRef.current.height / 2;
      if (cx <= 0 || cy <= 0) return;

      const pt = await anyMap.pointForCoordinate({ latitude: location.latitude, longitude: location.longitude });
      const dx = (pt?.x ?? 0) - cx;
      const dy = (pt?.y ?? 0) - cy;
      const dist = Math.hypot(dx, dy);

      const centered = dist <= CENTER_PX_THRESHOLD;
      setIsCentered(centered);

      if (userGestureRef.current && !centered) {
        isFollowingRef.current = false;
        setIsFollowing(false);
      }
    } catch {
    } finally {
      userGestureRef.current = false;
    }
  };

  const updateCenteredByRotation = async () => {
    try {
      if (!mapRef.current || !userGestureRef.current) return;
      const anyMap: any = mapRef.current;
      const cam = await anyMap.getCamera?.();
      const heading = cam?.heading ?? 0;
      if (Math.abs(heading) > ROT_EPS_DEG) {
        isFollowingRef.current = false;
        setIsFollowing(false);
        setIsCentered(false);
      }
    } catch {}
  };

  // ======== Permisos + watchPosition ========
  useEffect(() => {
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        const status = perm?.status ?? (perm as any);
        if (status !== 'granted') {
          setErrorMsg('Permiso de ubicación denegado');
          setLoading(false);
          return;
        }

        try {
          const lastLoc = await Location.getLastKnownPositionAsync();
          if (lastLoc && lastLoc.coords) {
            const { latitude, longitude } = lastLoc.coords;
            setLocation({ latitude, longitude });
            setLoading(false);
          } else {
            setLoading(false);
          }
        } catch (err) {
          setLoading(false);
        }

        try {
          locationSubRef.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 1000, distanceInterval: 1 },
            async (loc) => {
              try {
                const { latitude, longitude } = loc.coords;
                setLocation({ latitude, longitude });
                if (isFollowingRef.current && mapRef.current) {
                  if (!mapReadyRef.current) return;
                  const anyMap: any = mapRef.current;
                  try {
                    const cam = await anyMap.getCamera?.();
                    if (cam?.zoom != null && anyMap.animateCamera) {
                      await anyMap.animateCamera({ center: { latitude, longitude } }, { duration: 200 });
                    } else if (anyMap.animateToRegion) {
                      anyMap.animateToRegion({ latitude, longitude, latitudeDelta: TARGET_LAT_DELTA, longitudeDelta: TARGET_LON_DELTA });
                    } else {
                      anyMap.setRegion?.({ latitude, longitude, latitudeDelta: TARGET_LAT_DELTA, longitudeDelta: TARGET_LON_DELTA });
                    }
                    setIsCentered(true);
                  } catch (innerErr) {
                  }
                }
              } catch (cbErr) {
              }
            }
          );
        } catch (watchErr) {
        }
      } catch (err) {
        setErrorMsg('No se pudo activar la ubicación');
        setLoading(false);
      }
    })();

    return () => {
      try { locationSubRef.current?.remove(); } catch (e) { }
    };
  }, []);

  // ======== Cargar denuncias públicas ========
  const loadPublicReports = async () => {
    setLoadingReports(true);
    setNetworkError(false);
    try {
      // Verificar conectividad antes de llamar a la API
      try {
        const st = await Network.getNetworkStateAsync();
        const connected = !!st.isConnected && st.isInternetReachable !== false;
        if (!connected) {
          setNetworkError(true);
          return;
        }
      } catch {
        // Si falla la verificación, asumimos posible falta de red
        setNetworkError(true);
        return;
      }
      const reports = await fetchPublicReports();
      setPublicReports(reports);
      markersLoadedRef.current = true;
      setNetworkError(false);
      // Permitir que los markers rendericen sus vistas y luego congelar
      setFreezeMarkers(false);
      // ampliar ventana para evitar rasterización parcial (Android)
      setTimeout(() => setFreezeMarkers(true), 2200);
    } catch (err) {
      setNetworkError(true);
    } finally {
      setLoadingReports(false);
    }
  };

  // Cargar denuncias al montar y cuando se vuelve a la pantalla
  useFocusEffect(
    useCallback(() => {
      loadPublicReports();
    }, [])
  );

  // ======== Asegurar zoom/cámara inicial ========
  const ensureInitialCenter = async () => {
    if (!mapRef.current || !location || initialCenteredRef.current === true || !mapReadyRef.current) return;
    const { latitude, longitude } = location;
    const anyMap: any = mapRef.current;
    try {
      if (anyMap.animateCamera) {
        await anyMap.animateCamera({ center: { latitude, longitude }, zoom: TARGET_ZOOM, heading: 0, pitch: 0 }, { duration: 0 });
      } else if (anyMap.animateToRegion) {
        anyMap.animateToRegion({ latitude, longitude, latitudeDelta: TARGET_LAT_DELTA, longitudeDelta: TARGET_LON_DELTA }, 0);
      } else {
        anyMap.setRegion?.({ latitude, longitude, latitudeDelta: TARGET_LAT_DELTA, longitudeDelta: TARGET_LON_DELTA });
      }
      initialCenteredRef.current = true;
      isFollowingRef.current = true;
      setIsFollowing(true);
      setIsCentered(true);
    } catch {}
  };

  useEffect(() => { void ensureInitialCenter(); }, [location]);

  const handleCompassPress = (skipAnimateCameraHeading: boolean = false) => {
    if (!skipAnimateCameraHeading && mapRef.current) {
      try { (mapRef.current as any).animateCamera?.({ heading: 0 }); } catch {}
    }
    resetCompass();
  };

  const centerMap = async () => {
    if (!mapRef.current) return;
    const anyMap: any = mapRef.current;
    try {
      const pos = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = pos.coords;

      const now = Date.now();
      if (isCenteringRef.current) return;
      if (LAST_CENTERED_AT.current && now - LAST_CENTERED_AT.current < 500) return;

      isCenteringRef.current = true;

      try {
        if (anyMap.animateCamera) {
          await anyMap.animateCamera({ center: { latitude, longitude }, zoom: TARGET_ZOOM, heading: 0, pitch: 0 }, { duration: 220 });
        } else if (anyMap.animateToRegion) {
          anyMap.animateToRegion({ latitude, longitude, latitudeDelta: TARGET_LAT_DELTA, longitudeDelta: TARGET_LON_DELTA });
        } else {
          anyMap.setRegion?.({ latitude, longitude, latitudeDelta: TARGET_LAT_DELTA, longitudeDelta: TARGET_LON_DELTA });
        }
      } catch {}

      isFollowingRef.current = true;
      setIsFollowing(true);
      setIsCentered(true);
      LAST_CENTERED_AT.current = Date.now();
    } catch {} finally {
      setTimeout(() => { isCenteringRef.current = false; }, 300);
    }
  };

  const onPanDrag = () => {
    userGestureRef.current = true;
    if (isFollowingRef.current) {
      isFollowingRef.current = false;
      setIsFollowing(false);
    }
    if (isPanningRef.current) return;
    isPanningRef.current = true;
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(rafLoop);
    try { setIsCentered(false); } catch {}
  };

  const onRegionChange = (_region: Region) => {
    const region: any = _region as any;
    if (region?.heading !== undefined) {
      const h = region.heading as number;
      const prevN = ((mapRotation % 360) + 360) % 360;
      const targetN = ((h % 360) + 360) % 360;
      let diff = targetN - prevN; if (diff > 180) diff -= 360; if (diff < -180) diff += 360;
      setMapRotation(prevN + diff * 0.32);
      setCardinal(computeCardinal(h));
    } else if (region?.rotation !== undefined) {
      const r = region.rotation as number;
      const prevN = ((mapRotation % 360) + 360) % 360;
      const targetN = ((r % 360) + 360) % 360;
      let diff = targetN - prevN; if (diff > 180) diff -= 360; if (diff < -180) diff += 360;
      setMapRotation(prevN + diff * 0.32);
      setCardinal(computeCardinal(r));
    }
  };

  const onRegionChangeComplete = async (region: Region) => {
    isPanningRef.current = false;
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    await readCameraHeading();
    onRegionChange(region);
    // guardar region actual para cálculos de offset en píxeles -> coordenadas
    try { setMapRegion(region); } catch {}
    // actualizar zoom actual
    try {
      const anyMap: any = mapRef.current;
      const cam = await anyMap?.getCamera?.();
      if (cam?.zoom != null) setMapZoom(cam.zoom as number);
    } catch {}
    await updateCenteredByRotation();
    await updateCenteredByPixels();
  };

  // estado local para la region actual (necesario para convertir offsets px -> grados)
  const [mapRegion, setMapRegion] = useState<Region | null>(null);

  // cache de imágenes generadas para cada iconName (data-uri)
  const [iconUris, setIconUris] = useState<Record<string, string>>({});
  const hiddenRefs = useRef<Record<string, any>>({});

  // uniqueIconKeys y captura se declaran después de groupedItems

  // ======== Agrupación por categoría y distancia (metros) ========
  const GROUP_RADIUS_M = 50; // 50m para agrupar cercanos
  const TIME_WINDOW_MS = 24 * 60 * 60 * 1000; // últimas 24 horas

  type Report = typeof publicReports[number];
  
  // Filtrar reportes a solo los de las últimas 24h
  const recentReports: Report[] = React.useMemo(() => {
    const now = Date.now();
    return publicReports.filter((r) => {
      const t = new Date(r.fecha_creacion).getTime();
      return Number.isFinite(t) && (now - t) <= TIME_WINDOW_MS;
    });
  }, [publicReports]);
  const distanceMeters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
    const R = 6371000; // radio tierra (m)
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  };

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

  type GroupedItem = {
    id: string;
    latitude: number;
    longitude: number;
    categoryId: number | null;
    iconName: string;
    reports: Report[];
  };

  const groupedItems: GroupedItem[] = React.useMemo(() => {
    const result: GroupedItem[] = [];
    const assigned = new Set<string>();
    const nowMs = Date.now();
    for (const r of recentReports) {
      if (assigned.has(r.id)) continue;
      const anchor = r;
      const groupReports: Report[] = [anchor];
      assigned.add(anchor.id);
      for (const other of recentReports) {
        if (assigned.has(other.id)) continue;
        if (other.categoria_publica_id !== anchor.categoria_publica_id) continue;
        // Solo considerar reportes dentro de la ventana de 24h
        const tOther = new Date(other.fecha_creacion).getTime();
        if (!Number.isFinite(tOther) || (nowMs - tOther) > TIME_WINDOW_MS) continue;
        const tAnchor = new Date(anchor.fecha_creacion).getTime();
        // Si el ancla está fuera de 24h, no se agrupa (queda solo)
        if (!Number.isFinite(tAnchor) || (nowMs - tAnchor) > TIME_WINDOW_MS) continue;
        const d = distanceMeters(
          { latitude: anchor.coords_x, longitude: anchor.coords_y },
          { latitude: other.coords_x, longitude: other.coords_y }
        );
        if (d <= GROUP_RADIUS_M) {
          groupReports.push(other);
          assigned.add(other.id);
        }
      }
      const iconName = anchor.categoria_publica_id ? (ICON_MAP[anchor.categoria_publica_id] ?? 'map-marker') : 'map-marker';
      result.push({
        id: `grp-${anchor.categoria_publica_id ?? 'x'}-${anchor.id}`,
        latitude: anchor.coords_x,
        longitude: anchor.coords_y,
        categoryId: anchor.categoria_publica_id,
        iconName,
        reports: groupReports,
      });
      if (groupReports.length > 1) {
      }
    }
    return result;
  }, [recentReports]);

  // Generar claves únicas por iconName y count real (para agrupados)
  const uniqueIconKeys = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of recentReports) {
      const icon = r.categoria_publica_id ? (ICON_MAP[r.categoria_publica_id] ?? 'map-marker') : 'map-marker';
      set.add(`${icon}${SNAP_KEY_SEP}1`); // individual
    }
    for (const item of groupedItems) {
      if (item.reports.length > 1) {
        set.add(`${item.iconName}${SNAP_KEY_SEP}${item.reports.length}`);
      }
    }
    return Array.from(set);
  }, [recentReports, groupedItems]);

  useEffect(() => {
    // capturar cada CategoryPin (individual y agrupado) offscreen y guardar data-uri en cache
    (async () => {
      try {
        for (const key of uniqueIconKeys) {
          if (iconUris[key]) continue;
          const ref = hiddenRefs.current[key];
          if (!ref) continue;
          try {
            const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'data-uri' });
            setIconUris((s) => ({ ...s, [key]: uri }));
          } catch (err) {
            // ignore capture errors and leave fallback
          }
        }
      } catch {}
    })();
  }, [uniqueIconKeys]);

  // (Obsoleto) offsetCoordinate: dejamos de usar offset en píxeles para evitar drift según zoom

  // Offset estable por metros (no depende del zoom)
  const offsetByMeters = (lat: number, lon: number, radiusMeters: number, angleRad: number) => {
    const metersPerDegLat = 111320; // aproximación
    const metersPerDegLon = 111320 * Math.cos((lat * Math.PI) / 180);
    const dLat = (radiusMeters * Math.sin(angleRad)) / metersPerDegLat;
    const dLon = (radiusMeters * Math.cos(angleRad)) / metersPerDegLon;
    return { latitude: lat + dLat, longitude: lon + dLon };
  };

  // Detectar pines superpuestos (misma ubicación exacta) para los items ya AGRUPADOS
  const overlapGroups = React.useMemo(() => {
    const positionMap = new Map<string, string[]>();
    for (const item of groupedItems) {
      const key = `${item.latitude.toFixed(6)}|${item.longitude.toFixed(6)}`;
      const list = positionMap.get(key) ?? [];
      list.push(item.id);
      positionMap.set(key, list);
    }
    const result = new Map<string, { size: number; index: number }>();
    for (const [key, ids] of positionMap) {
      const size = ids.length;
      if (size > 1) {
      }
      ids.forEach((id, i) => result.set(id, { size, index: i }));
    }
    return result;
  }, [groupedItems]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      isPanningRef.current = false;
      if (animatedAnimRef.current) { try { animatedAnimRef.current.stop(); } catch {} animatedAnimRef.current = null; }
      try { locationSubRef.current?.remove(); } catch {}
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size={64} color="#0A4A90" />
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.centered}>
        <IconSymbol name="gps-fixed" size={48} color="#0A4A90" />
        {errorMsg ? <Text>{errorMsg}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: tabBarHeightLocal }]}>
      {/* Hidden offscreen render for CategoryPin snapshots (individual y agrupado con count real) */}
      <View style={{ position: 'absolute', left: -2000, top: -2000, opacity: 0 }} pointerEvents="none">
        {uniqueIconKeys.map((key) => {
          // key: iconName__COUNT__count (SNAP_KEY_SEP)
          const [iconName, countStr] = key.split(SNAP_KEY_SEP);
          const count = Number.parseInt(countStr ?? '1', 10) || 1;
          return (
            <View
              key={`hidden-${key}`}
              ref={(r) => { hiddenRefs.current[key] = r; }}
              collapsable={false}
            >
              <CategoryPin iconName={iconName} size={PIN_SIZE} count={count > 1 ? count : undefined} />
            </View>
          );
        })}
      </View>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        // disable Android map toolbar (open in Google Maps / directions) which shows extra icons
        toolbarEnabled={false}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        loadingEnabled
        showsCompass={false}
        customMapStyle={mapStyle}
        onMapReady={() => {
          mapReadyRef.current = true;
          void ensureInitialCenter();
          // Leer zoom inicial
          try {
            const anyMap: any = mapRef.current;
            anyMap?.getCamera?.().then((cam: any) => { if (cam?.zoom != null) setMapZoom(cam.zoom as number); }).catch(() => {});
          } catch {}
        }}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          mapLayoutRef.current = { width, height };
          void ensureInitialCenter();
        }}
        onRegionChange={onRegionChange}
        onRegionChangeComplete={onRegionChangeComplete}
        onPanDrag={onPanDrag}
        onTouchStart={() => { startRaf(); userGestureRef.current = true; if (isFollowingRef.current) { isFollowingRef.current = false; setIsFollowing(false); } setIsCentered(false); }}
        onTouchEnd={() => { setTimeout(() => stopRaf(), 80); }}
      >
        {/* Cambiar entre vista agrupada e individual según zoom, manteniendo radios */}
        {(() => {
          const showGrouped = (mapZoom ?? 0) < ZOOM_CLUSTER_BREAK;
          if (showGrouped) {
            // Vista AGRUPADA
            return groupedItems.map((item) => {
              const coord = { latitude: item.latitude, longitude: item.longitude };
              const ov = overlapGroups.get(item.id);
              const coordDisplay = (() => {
                if (ov && ov.size > 1) {
                  const angle = (2 * Math.PI * ov.index) / ov.size;
                  return offsetByMeters(coord.latitude, coord.longitude, 2.5 /* m */, angle);
                }
                return coord;
              })();

              const count = item.reports.length;
              const reportIds = item.reports.map(r => r.id);
              const iconKey = `${item.iconName}${SNAP_KEY_SEP}${count}`;
              const useNativeIcon = Platform.OS === 'android' && iconUris[iconKey];

              return (
                <React.Fragment key={`group-${item.id}`}>
                  {count > 1 && (
                    <Circle
                      key={`circle-${item.id}`}
                      center={coordDisplay}
                      radius={GROUP_RADIUS_M}
                      fillColor="rgba(0,172,255,0.15)"
                      strokeColor="#00ACFF"
                      strokeWidth={2}
                      zIndex={1}
                    />
                  )}
                  <Marker
                    key={`marker-${item.id}`}
                    coordinate={coordDisplay}
                    anchor={{ x: 0.5, y: 1 }}
                    zIndex={2}
                    tracksViewChanges={!freezeMarkers}
                    onPress={() => {
                      if (reportIds.length > 0) {
                        setSelectedReportIds(reportIds);
                        setShowDetailModal(true);
                      }
                    }}
                    {...(useNativeIcon ? { icon: { uri: iconUris[iconKey] } as any } : {})}
                  >
                    {useNativeIcon ? null : (
                      <CategoryPin 
                        iconName={item.iconName} 
                        pinColor="#FF3B30" 
                        size={PIN_SIZE}
                        count={count}
                      />
                    )}
                  </Marker>
                </React.Fragment>
              );
            });
          }

          // Vista INDIVIDUAL (zoom alto)
          type Individual = { id: string; reportId: string; latitude: number; longitude: number; iconName: string; groupSize: number };
          const individuals: Individual[] = [];
          for (const g of groupedItems) {
            for (const r of g.reports) {
              const iconName = r.categoria_publica_id ? (ICON_MAP[r.categoria_publica_id] ?? 'map-marker') : 'map-marker';
              individuals.push({
                id: `ind-${r.id}`,
                reportId: r.id,
                latitude: r.coords_x,
                longitude: r.coords_y,
                iconName,
                groupSize: g.reports.length,
              });
            }
          }

          // Evitar superposición exacta entre individuales
          const posMap = new Map<string, string[]>();
          individuals.forEach((it) => {
            const key = `${it.latitude.toFixed(6)}|${it.longitude.toFixed(6)}`;
            const list = posMap.get(key) ?? [];
            list.push(it.id);
            posMap.set(key, list);
          });
          const overlapInd = new Map<string, { size: number; index: number }>();
          for (const [key, ids] of posMap) {
            const size = ids.length;
            ids.forEach((id, i) => overlapInd.set(id, { size, index: i }));
          }

          return individuals.map((it) => {
            const coord = { latitude: it.latitude, longitude: it.longitude };
            const ov = overlapInd.get(it.id);
            const coordDisplay = (() => {
              if (ov && ov.size > 1) {
                const angle = (2 * Math.PI * ov.index) / ov.size;
                return offsetByMeters(coord.latitude, coord.longitude, 2.5 /* m */, angle);
              }
              return coord;
            })();

            const iconKey = `${it.iconName}${SNAP_KEY_SEP}1`;
            const useNativeIcon = Platform.OS === 'android' && iconUris[iconKey];

            return (
              <React.Fragment key={`ind-frag-${it.id}`}>
                {it.groupSize > 1 && (
                  <Circle
                    key={`ind-circle-${it.id}`}
                    center={coordDisplay}
                    radius={GROUP_RADIUS_M}
                    fillColor="rgba(0,172,255,0.15)"
                    strokeColor="#00ACFF"
                    strokeWidth={2}
                    zIndex={1}
                  />
                )}
                <Marker
                  key={`marker-${it.id}`}
                  coordinate={coordDisplay}
                  anchor={{ x: 0.5, y: 1 }}
                  zIndex={2}
                  tracksViewChanges={!freezeMarkers}
                  onPress={() => {
                    setSelectedReportIds([it.reportId]);
                    setShowDetailModal(true);
                  }}
                  {...(useNativeIcon ? { icon: { uri: iconUris[iconKey] } as any } : {})}
                >
                  {useNativeIcon ? null : (
                    <CategoryPin 
                      iconName={it.iconName} 
                      pinColor="#FF3B30" 
                      size={PIN_SIZE}
                    />
                  )}
                </Marker>
              </React.Fragment>
            );
          });
        })()}
      </MapView>

      {/* Debug overlay 'Denuncias' removed per UX request */}

      {bottomOverlayHeight > 0 && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: bottomOverlayHeight, backgroundColor: Colors[scheme ?? 'light'].background }} />
      )}

      <View style={[styles.fabContainer, { bottom: Math.max(fabBottomAboveTab, fabBottomOffset) }]}>
        <Button
          onPress={() => { handleCompassPress(false); }}
          style={styles.compassFab}
          accessibilityLabel="Brújula"
        >
          <View style={styles.compassContent} pointerEvents="none">
            <Animated.View style={{ transform: [{ rotate: animatedRotationRef.current.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) }] }}>
              <IconSymbol name="compass-rose" size={COMPASS_ICON_SIZE} color="#fff" />
            </Animated.View>
            <View style={styles.compassLabels} pointerEvents="none">
              <View style={styles.northWrapper} pointerEvents="none">
                <IconSymbol name="arrow-drop-up" size={NS_ARROW_SIZE} color={cardinal === 'N' ? '#fff' : 'rgba(255,255,255,0.6)'} style={[styles.arrowAbsolute, styles.arrowNorthAbs, { opacity: cardinal === 'N' ? 1 : 0.9 }]} />
                <Text style={[styles.compassLabel, { color: cardinal === 'N' ? '#fff' : 'rgba(255,255,255,0.6)' }]}>N</Text>
              </View>
              <View style={styles.neWrapper} pointerEvents="none">
                <View style={[styles.diag, styles.diagNE, { backgroundColor: cardinal === 'NE' ? '#fff' : 'rgba(255,255,255,0.6)' }]} />
              </View>
              <View style={styles.eastWrapper} pointerEvents="none">
                <Text style={[styles.compassLabel, { color: cardinal === 'E' ? '#fff' : 'rgba(255,255,255,0.6)' }]}>E</Text>
              </View>
              <View style={styles.seWrapper} pointerEvents="none">
                <View style={[styles.diag, styles.diagSE, { backgroundColor: cardinal === 'SE' ? '#fff' : 'rgba(255,255,255,0.6)' }]} />
              </View>
              <View style={styles.southWrapper} pointerEvents="none">
                <IconSymbol name="arrow-drop-up" size={NS_ARROW_SIZE} color={cardinal === 'S' ? '#fff' : 'rgba(255,255,255,0.6)'} style={[styles.arrowAbsolute, styles.arrowSouthAbs, { opacity: cardinal === 'S' ? 1 : 0.9 }]} />
                <Text style={[styles.compassLabel, { color: cardinal === 'S' ? '#fff' : 'rgba(255,255,255,0.6)' }]}>S</Text>
              </View>
              <View style={styles.soWrapper} pointerEvents="none">
                <View style={[styles.diag, styles.diagSO, { backgroundColor: cardinal === 'SO' ? '#fff' : 'rgba(255,255,255,0.6)' }]} />
              </View>
              <View style={styles.westWrapper} pointerEvents="none">
                <Text style={[styles.compassLabel, { color: cardinal === 'O' ? '#fff' : 'rgba(255,255,255,0.6)' }]}>O</Text>
              </View>
              <View style={styles.noWrapper} pointerEvents="none">
                <View style={[styles.diag, styles.diagNO, { backgroundColor: cardinal === 'NO' ? '#fff' : 'rgba(255,255,255,0.6)' }]} />
              </View>
            </View>
          </View>
        </Button>

        <Button
          onPress={async () => { await centerMap(); handleCompassPress(true); }}
          style={styles.fab}
          accessibilityLabel="Centrar ubicación"
        >
          <IconSymbol name={isCentered ? 'my-location' : 'location-searching'} size={FAB_ICON_SIZE} color="#fff" />
        </Button>

        <View style={styles.arrowEOContainer} pointerEvents="none">
      <IconSymbol name="arrow-drop-up" size={EO_ARROW_SIZE} color={cardinal === 'E' ? '#fff' : 'rgba(255,255,255,0.6)'} style={[styles.arrowEO, styles.arrowEastEO, { opacity: cardinal === 'E' ? 1 : 0.9 }]} />
      <IconSymbol name="arrow-drop-up" size={EO_ARROW_SIZE} color={cardinal === 'O' ? '#fff' : 'rgba(255,255,255,0.6)'} style={[styles.arrowEO, styles.arrowWestEO, { opacity: cardinal === 'O' ? 1 : 0.9 }]} />
        </View>
      </View>

      {/* Mensaje de error de conexión */}
      {networkError && (
        <View style={[styles.networkErrorContainer, { backgroundColor: scheme === 'dark' ? 'rgba(7, 18, 41, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
          <IconSymbol name="wifi-off" size={48} color="#EF4444" />
          <Text style={[styles.networkErrorTitle, { color: scheme === 'dark' ? '#E6EEF8' : '#0F1724' }]}>Sin conexión a la red</Text>
          <Text style={[styles.networkErrorText, { color: scheme === 'dark' ? '#9CA3AF' : '#6B7280' }]}>
            No se pudieron cargar las denuncias. Verifica tu conexión.
          </Text>
          <TouchableOpacity
            onPress={loadPublicReports}
            disabled={loadingReports}
            style={[styles.retryButton, { opacity: loadingReports ? 0.6 : 1 }]}
            activeOpacity={0.8}
          >
            {loadingReports ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <IconSymbol name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de detalle de denuncia */}
      <ReportDetailModal
        visible={showDetailModal}
        reportId={null}
        reportIds={selectedReportIds}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedReportIds([]);
        }}
      />
    </View>
  );
}
