import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
// usamos IconSymbol centralizado en lugar de importar familias directamente
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, PixelRatio, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../../components/Button';
import { IconSymbol } from '../../../../components/ui/icon-symbol';

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

// ======== Map behavior tunables (clave) ========
// Umbral de píxeles para considerar “centrado” (Google es MUY sensible).
// Lo hacemos en puntos independientes de densidad (dp).
const CENTER_PX_THRESHOLD = Math.max(3, Math.round(4 * SCALE)); // 3–6 dp es razonable
// Umbral de rotación para considerar descentrado si giras el mapa
const ROT_EPS_DEG = 0.5;
// Zoom alvo cuando centramos (fallback con lat/lon deltas)
const TARGET_ZOOM = 18; // ~calle
const TARGET_LAT_DELTA = 0.0015;
const TARGET_LON_DELTA = 0.0015;

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  map: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fabContainer: { position: 'absolute', right: 24, bottom: 32, alignItems: 'center', zIndex: 10 },
  compassFab: {
    marginBottom: Math.round(12 * SCALE),
    width: COMPASS_SIZE, height: COMPASS_SIZE, borderRadius: Math.round(COMPASS_SIZE / 2),
    backgroundColor: '#0A4A90', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5, overflow: 'visible',
  },
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
  fab: {
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: Math.round(FAB_SIZE / 2),
    backgroundColor: '#0A4A90', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
});



// Estilo de mapa oscuro que mantiene POI/íconos visibles
const DARK_MAP_STYLE = [
  // Base + labels
  { elementType: 'geometry', stylers: [{ color: '#0b1627' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#eaf2ff' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1627' }] },

  // Agua
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a2740' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#bfe1ff' }] },

  // Límites administrativos
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#23344a' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d6e7ff' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#c7dbff' }] },

  // Paisaje/edificaciones + POI
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#182e50ff' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#0f1d33' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#deebff' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#112b1e' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#b8f8d0' }] },
  { featureType: 'poi.business', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },

  // Autopistas
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2e3f63' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#5d718c' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#e2eeff' }] },

  // Arteriales
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#22344a' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#3b557a' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#d6e7ff' }] },

  // Calles locales (más detalle)
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#18263e' }] },
  { featureType: 'road.local', elementType: 'geometry.stroke', stylers: [{ color: '#2b405f' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#cfe2ff' }] },

  // Íconos de vías visibles (coches, giros, etc.)
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },

  // Tránsito
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#3a7bd5' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#eaf2ff' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
];


export default function CurrentLocationMap() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const navBarHeightAndroid = Platform.OS === 'android'
    ? Math.max(0, Dimensions.get('screen').height - Dimensions.get('window').height)
    : 0;
  const bottomOverlayHeight = Math.max(insets.bottom || 0, navBarHeightAndroid || 0);
  const TAB_BAR_BASE = 72;
  const tabBarHeightLocal = TAB_BAR_BASE + bottomOverlayHeight;

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
  const [isCentered, setIsCentered] = useState(true);     // Estado visual del botón
  const [isFollowing, setIsFollowing] = useState(true);    // “Follow mode” real
  const isFollowingRef = useRef(true);

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const mapReadyRef = useRef(false);
  const mapLayoutRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const initialCenteredRef = useRef(false);
  const isCenteringRef = useRef(false);
  const LAST_CENTERED_AT = useRef<number | null>(null);

  const userGestureRef = useRef(false); // true si el último cambio vino del usuario (pan/rotate)
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  const fabBottomOffset = 24 + Math.max(0, insets.bottom);
  const fabBottomAboveTab = tabBarHeightLocal + 16;

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
        const prevMod = ((prev % 360) + 360) % 360;
        let delta = targetN - prevMod;
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
      // Centro del viewport en puntos
      const cx = mapLayoutRef.current.width / 2;
      const cy = mapLayoutRef.current.height / 2;
      if (cx <= 0 || cy <= 0) return;

      // Proyectar la ubicación del usuario al plano de pantalla
      const pt = await anyMap.pointForCoordinate({ latitude: location.latitude, longitude: location.longitude });
      const dx = (pt?.x ?? 0) - cx;
      const dy = (pt?.y ?? 0) - cy;
      const dist = Math.hypot(dx, dy);

      const centered = dist <= CENTER_PX_THRESHOLD;
      setIsCentered(centered);

      // Si esto viene de gesto del usuario y está fuera del umbral, apaga seguimiento
      if (userGestureRef.current && !centered) {
        isFollowingRef.current = false;
        setIsFollowing(false);
      }
    } catch {
      // Si falla la proyección, no rompemos UX
    } finally {
      userGestureRef.current = false; // consumido
    }
  };

  // También marcar descentrado si rotaste el mapa nada (epsilon)
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

  // ======== Permisos + watchPosition (seguir físicamente cuando hay follow) ========
  const initLocation = React.useCallback(async () => {
    try {
      setErrorMsg(null);
      const perm = await Location.requestForegroundPermissionsAsync();
      const status = perm?.status ?? (perm as any);
      if (status !== 'granted') {
        setErrorMsg('Permiso de ubicación denegado');
        setLoading(false);
        return;
      }

      // Intento rápido con last-known para dibujar algo ya
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
        console.warn('getLastKnownPositionAsync falló', err);
        setLoading(false);
      }

      // Alta de watcher (seguir físico SOLO si isFollowing)
      try {
        // limpiar watcher previo si existiera
        try { locationSubRef.current?.remove(); } catch {}
        locationSubRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 1000, distanceInterval: 1 },
          async (loc) => {
            try {
              const { latitude, longitude } = loc.coords;
              setLocation({ latitude, longitude });
              if (isFollowingRef.current && mapRef.current) {
                const anyMap: any = mapRef.current;
                // Mantener zoom/tilt/heading; sólo mover centro
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
                  console.warn('Error al actualizar cámara desde watcher', innerErr);
                }
              }
            } catch (cbErr) {
              console.warn('Callback de watchPositionAsync falló', cbErr);
            }
          }
        );
      } catch (watchErr) {
        console.warn('watchPositionAsync falló', watchErr);
      }
    } catch (err) {
      console.error('Inicialización de ubicación falló', err);
      setErrorMsg('No se pudo activar la ubicación');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void initLocation();
    return () => {
      try { locationSubRef.current?.remove(); } catch (e) { console.warn('Error al remover subscription', e); }
    };
  }, [initLocation]);

  // ======== Asegurar zoom/cámara inicial apenas mapa + ubicación listos ========
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

  // ======== Botón brújula ========
  const handleCompassPress = (skipAnimateCameraHeading: boolean = false) => {
    if (!skipAnimateCameraHeading && mapRef.current) {
      try { (mapRef.current as any).animateCamera?.({ heading: 0 }); } catch {}
    }
    resetCompass();
  };

  // ======== Botón centrar ========
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

      // Activa follow al tocar el botón, como Google
      isFollowingRef.current = true;
      setIsFollowing(true);
      setIsCentered(true);
      LAST_CENTERED_AT.current = Date.now();
    } catch {} finally {
      setTimeout(() => { isCenteringRef.current = false; }, 300);
    }
  };

  // ======== Handlers de gestos/región ========
  const onPanDrag = () => {
    userGestureRef.current = true; // viene de usuario
    // Si el usuario inicia un pan, desactivar inmediatamente el modo "follow"
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
    await updateCenteredByRotation();
    await updateCenteredByPixels();
  };

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

  // Si hay un error en la inicialización de ubicación, no renderizamos MapView.
  if (errorMsg) {
    return (
      <View style={styles.centered}>
        <Text style={{ marginBottom: 12 }}>{errorMsg}</Text>
        <Button
          onPress={() => {
            setErrorMsg(null);
            setLoading(true);
            void initLocation();
          }}
        >
          Reintentar
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: tabBarHeightLocal }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          // Fallback mínimo: si por alguna razón no entra ensureInitialCenter,
          // esto al menos no se ve “a lo lejos”.
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        }}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          mapLayoutRef.current = { width, height };
          // Si ya tengo ubicación y el mapa acaba de layout, asegurar centrado
          void ensureInitialCenter();
        }}
        onMapReady={() => {
          mapReadyRef.current = true;
          void ensureInitialCenter();
        }}
        showsUserLocation
        showsMyLocationButton={false}
        loadingEnabled
  // Aplicar estilo similar a Google Maps en Android cuando el sistema está en dark
  // En iOS dejamos el estilo por defecto (Apple Maps puede interpretarlo distinto)
  customMapStyle={scheme === 'dark' && Platform.OS === 'android' ? DARK_MAP_STYLE : undefined}
        onRegionChange={onRegionChange}
        onRegionChangeComplete={onRegionChangeComplete}
        onPanDrag={onPanDrag}
  onTouchStart={() => { startRaf(); userGestureRef.current = true; if (isFollowingRef.current) { isFollowingRef.current = false; setIsFollowing(false); } setIsCentered(false); }}
        onTouchEnd={() => { setTimeout(() => stopRaf(), 80); }}
        showsCompass={false}
      />

      {/* Overlay inferior para no tapar con la nav bar del sistema */}
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
    </View>
  );
}
