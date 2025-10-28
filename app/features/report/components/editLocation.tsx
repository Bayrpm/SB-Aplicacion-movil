import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { invokeLocationEdit } from '../types/locationBridge';
import { getReportFormSnapshot, setReportFormSnapshot } from '../types/reportFormBridge';

type SuggestItem = { label: string; lat?: number; lon?: number; score?: number; src: 'photon' | 'nominatim' | 'google'; placeId?: string };

export default function EditLocationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  const qLat = Number(params.lat ?? '');
  const qLng = Number(params.lng ?? '');
  const qAddr = typeof params.addr === 'string' ? decodeURIComponent(String(params.addr)) : '';

  const [center, setCenter] = useState<{ latitude: number; longitude: number } | null>(
    qLat && qLng ? { latitude: qLat, longitude: qLng } : null
  );

  const [mapReady, setMapReady] = useState(false);
  const didInitialCamera = useRef(false);
  const mapRef = useRef<MapView | null>(null);

  // Layout
  const NAV_CONTENT_H = 56;
  const NAV_HEIGHT = (insets.top || 0) + NAV_CONTENT_H;
  const SEARCH_H = 48;

  // Bottom / tab safe area
  const navBarHeightAndroid =
    Platform.OS === 'android'
      ? Math.max(0, Dimensions.get('screen').height - Dimensions.get('window').height)
      : 0;
  const bottomOverlayHeight = Math.max(insets.bottom || 0, Math.min(navBarHeightAndroid || 0, 48));
  const tabBarHeightLocal = bottomOverlayHeight || 0;

  // BBOX Región Metropolitana (aprox — minlon,minlat,maxlon,maxlat)
  const STGO_BBOX = { minlon: -71.30, minlat: -33.95, maxlon: -69.90, maxlat: -32.70 };

  // Search / suggestions
  const [searchText, setSearchText] = useState(qAddr ? sanitizeShort(qAddr) : '');
  const searchRef = useRef<TextInput | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Abort controller único para todas las búsquedas
  const abortControllerRef = useRef<AbortController | null>(null);
  // Para control de debounce y última query
  const debounceRef = useRef<any>(null);
  const lastQueryRef = useRef<string>('');
  const cacheRef = useRef<Map<string, SuggestItem[]>>(new Map());

  // Reverse geocoding
  const [revLoading, setRevLoading] = useState(false);
  const revTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [footerHeight, setFooterHeight] = useState(0);

  // ===== Helpers =====
  const TYPE_REGEX = /(avenida|av\.?|calle|pasaje|camino|ruta|autopista|alameda|costanera|pje\.?)/i;

  function sanitizeShort(raw: string): string {
    if (!raw) return '';
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter((p) => {
        if (!p) return false;
        if (/^\d{3,}$/.test(p)) return false; // C.P.
        const lower = p.toLowerCase();
        if (lower.includes('región') || lower.includes('region') || lower.includes('provincia') || lower.includes('metropolitana') || lower.includes('chile')) {
          return false;
        }
        return true;
      });

    const out: string[] = [];
    for (const p of parts) if (!out.includes(p)) out.push(p);
    return out.slice(0, 2).join(', ') || raw;
  }

  function formatReverseAddress(p: any): string {
    // Solo mostrar 'calle 123, comuna', nunca código postal ni región
    let street = p?.street || p?.name || '';
    let number = '';
    // Detectar número en el nombre si corresponde
    if (p?.name && /^\d+$/.test(String(p.name).trim())) {
      number = String(p.name).trim();
      street = (p?.street || '').trim();
    } else {
      const mNameNum = String(p.name || '').trim().match(/(\d+)$/);
      if (mNameNum && p?.street) {
        number = mNameNum[1];
        street = (p?.street || '').trim();
      } else {
        const mStreetNum = street.match(/^(.*?)[,\s]+(\d+)\s*$/);
        if (mStreetNum) {
          street = (mStreetNum[1] || '').trim();
          number = mStreetNum[2] || '';
        }
      }
    }
    street = street
      .replace(/^\s*(Av\.?|Av)\s+/i, 'Avenida ')
      .replace(/^\s*(C\.?|Calle|C)\s+/i, 'Calle ')
      .replace(/^\s*(Pje\.?|Pje)\s+/i, 'Pasaje ')
      .replace(/^\s*(Gral\.?|Gral)\s+/i, 'General ')
      .replace(/^\s*(Bv\.?|Bvar\.?|Bulevar|Bulev)\s+/i, 'Bulevar ');
    const streetAndNumber = [street, number].filter(Boolean).join(' ').trim();
    const comuna = p?.city || p?.town || p?.village || p?.municipality || p?.county || p?.district || 'Santiago';
    return sanitizeShort([streetAndNumber, comuna].filter(Boolean).join(', ')) || 'Mi ubicación';
  }

  function applySynonyms(q: string): string[] {
    const base = q.trim();
    const out = new Set<string>([base]);
    if (/^\s*gran\s+avenida(\b|$)/i.test(base)) {
      out.add(base.replace(/^\s*gran\s+avenida/i, 'Gran Avenida José Miguel Carrera'));
    }
    const m = base.match(/^(.+?)\s+(\d+)(?:\s*,\s*(.+))?$/i);
    if (m && !TYPE_REGEX.test(base)) {
      const name = m[1].trim();
      const num = m[2].trim();
      const tail = (m[3] || '').trim();
      ['Avenida', 'Calle', 'Pasaje', 'Camino'].forEach((tipo) => {
        out.add(`${tipo} ${name} ${num}${tail ? `, ${tail}` : ''}`);
      });
    }
    return Array.from(out);
  }

  function scoreByQuery(label: string, queryTokens: string[], lat?: number, lon?: number): number {
    let score = 0;
    const labLower = label.toLowerCase();
    queryTokens.forEach((t) => {
      if (labLower.includes(t)) score += 3;
    });
    if (center && typeof lat === 'number' && typeof lon === 'number') {
      const dLat = Math.abs(center.latitude - lat);
      const dLon = Math.abs(center.longitude - lon);
      const approx = dLat + dLon;
      score += Math.max(0, 2.5 - approx * 50);
    }
    return score;
  }

  function ensureComuna(label: string, comuna?: string): string {
    if (!/,/.test(label)) {
      const c = comuna || 'Santiago';
      return `${label}, ${c}`;
    }
    return label;
  }

  // ===== Providers =====
  const GOOGLE_API_KEY =
    (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY as string) ||
    (Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY as string);

  const fetchGoogleAutocomplete = useCallback(async (input: string, signal?: AbortSignal): Promise<SuggestItem[]> => {
    if (!input) return [];
    try {
      const q = encodeURIComponent(input);
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${q}&key=${GOOGLE_API_KEY}&components=country:cl&language=es&types=address`;
      const resp = await fetch(url, { signal } as any);
      if (!resp.ok) return [];
      const js = await resp.json();
      if (js.status !== 'OK' && js.status !== 'ZERO_RESULTS') return [];
      return (js.predictions || []).slice(0, 12).map((p: any) => ({ label: p.description, placeId: p.place_id, src: 'google' }));
    } catch {
      return [];
    }
  }, [GOOGLE_API_KEY]);

  const fetchPlaceDetails = useCallback(async (placeId: string, signal?: AbortSignal): Promise<{ lat: number; lon: number } | null> => {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}&fields=geometry`;
      const resp = await fetch(url, { signal } as any);
      if (!resp.ok) return null;
      const js = await resp.json();
      if (js.status !== 'OK') return null;
      const loc = js.result?.geometry?.location;
      if (!loc) return null;
      return { lat: Number(loc.lat), lon: Number(loc.lng) };
    } catch {
      return null;
    }
  }, [GOOGLE_API_KEY]);

  function nominatimSearchUrls(raw: string): string[] {
    const base = 'https://nominatim.openstreetmap.org/search';
    const common = `format=json&addressdetails=1&limit=12&countrycodes=cl&autocomplete=1`;
    const vb = `${STGO_BBOX.minlon},${STGO_BBOX.minlat},${STGO_BBOX.maxlon},${STGO_BBOX.maxlat}`;
    const headers = [
      `${base}?${common}&q=${encodeURIComponent(raw)}&viewbox=${vb}&bounded=1`,
      `${base}?${common}&q=${encodeURIComponent(raw)}`,
    ];
    const m = raw.match(/^(.+?)\s+(\d+)\s*(?:,\s*(.+))?$/i);
    if (m) {
      const street = `${m[1]} ${m[2]}`;
      const city = (m[3] || 'Santiago').trim();
      headers.unshift(`${base}?${common}&street=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}`);
    }
    return headers;
  }

  const fetchNominatim = useCallback(async (raw: string, signal?: AbortSignal): Promise<SuggestItem[]> => {
    const urls = nominatimSearchUrls(raw);
    const tokens = raw.toLowerCase().split(/[\s,]+/).filter((t) => t.length > 1);
    const results: SuggestItem[] = [];
    const headers: Record<string, string> = {
      'Accept-Language': 'es-CL,es;q=0.9',
      'User-Agent': 'SB-Aplicacion-movil/1.0 (contacto: tu-email@dominio.cl)',
      'Referer': 'https://tu-dominio.cl/app',
    };
    const push = (i: SuggestItem) => {
      if (!results.find((r) => r.label === i.label)) results.push(i);
    };
    for (const url of urls) {
      try {
        const resp = await fetch(url, { headers, signal } as any);
        if (!resp.ok) continue;
        const js = (await resp.json()) as any[];
        for (const s of js) {
          const addr = s.address || {};
          const displayParts = (s.display_name || '')
            .split(',')
            .map((p: string) => p.trim())
            .filter((p: string) => {
              if (!p) return false;
              if (/^\d{3,}$/.test(p)) return false;
              const lower = p.toLowerCase();
              if (lower.includes('región') || lower.includes('region') || lower.includes('provincia') || lower.includes('metropolitana') || lower.includes('chile')) return false;
              return true;
            });
          const first = displayParts[0] || '';
          const road = addr.road || addr.residential || addr.pedestrian || addr.cycleway || addr.path || '';
          const number = addr.house_number || addr.housenumber || '';
          let comuna = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
          if (!comuna) comuna = displayParts[1] || 'Santiago';
          const hasTypeInFirst = TYPE_REGEX.test(first);
          const streetFromAddr = road ? `${road}${number ? ` ${number}` : ''}` : '';
          const street = hasTypeInFirst ? first : streetFromAddr || first;
          if (!street) continue;
          const label = ensureComuna(sanitizeShort([street, comuna].filter(Boolean).join(', ')), comuna);
          const lat = Number(s.lat);
          const lon = Number(s.lon);
          const score = scoreByQuery(label, tokens, lat, lon);
          push({ label, lat, lon, score, src: 'nominatim' });
          if (results.length >= 12) break;
        }
        if (results.length >= 12) break;
      } catch {}
    }
    results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return results;
  }, []);

  // ===== Ubicación inicial =====
  useEffect(() => {
    (async () => {
      try {
        if (center) return;
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          AppAlert.alert('Ubicación', 'Permiso denegado para acceder a la ubicación.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        const { latitude, longitude } = pos.coords;
        setCenter({ latitude, longitude });
        try {
          const places = await Location.reverseGeocodeAsync({ latitude, longitude });
          const p = places?.[0] ?? null;
          if (p) setSearchText(formatReverseAddress(p));
        } catch {}
        if (mapReady && !didInitialCamera.current) {
          didInitialCamera.current = true;
          await animateTo(latitude, longitude, 19, 0);
        }
      } catch {
        AppAlert.alert('Ubicación', 'No se pudo obtener la ubicación.');
      }
    })();
  }, [mapReady]);

  useEffect(() => {
    if (qAddr) setSearchText(sanitizeShort(qAddr));
  }, [qAddr]);

  // ====== AUTOCOMPLETADO ======
  const runAutocomplete = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setSuggestLoading(true);
    try {
      let googleItems: SuggestItem[] = [];
      try {
        googleItems = await fetchGoogleAutocomplete(q, controller.signal);
      } catch {}
      if (googleItems && googleItems.length > 0) {
        setSuggestions(googleItems);
        cacheRef.current.set(`${q}|g`, googleItems);
      } else {
        const nomi = await fetchNominatim(q, controller.signal);
        setSuggestions(nomi);
        cacheRef.current.set(`${q}|n`, nomi);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestLoading(false);
    }
  }, [fetchGoogleAutocomplete, fetchNominatim]);

  useEffect(() => {
    if (!isTyping) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchText !== lastQueryRef.current) {
        lastQueryRef.current = searchText;
        runAutocomplete(searchText);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText, isTyping, runAutocomplete]);

  const onSelectSuggestion = useCallback(async (item: SuggestItem) => {
    Keyboard.dismiss();
    setIsTyping(false);
    setSuggestions([]);
    setSearchText(item.label);
    try {
      if (item.lat != null && item.lon != null) {
        await animateTo(item.lat, item.lon, 19);
        return;
      }
      if (item.placeId) {
        const coords = await fetchPlaceDetails(item.placeId);
        if (coords) {
          await animateTo(coords.lat, coords.lon, 19);
        } else {
          AppAlert.alert('Búsqueda', 'No se pudo obtener la ubicación exacta para esa sugerencia.');
        }
      }
    } catch {}
  }, [fetchPlaceDetails]);

  const runFreeSearch = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    try {
      setSuggestLoading(true);
      await runAutocomplete(q);
      const items = cacheRef.current.get(`${q}|g`) || suggestions;
      if (items && items[0]) {
        setSearchText(items[0].label);
        await onSelectSuggestion(items[0]);
      } else {
        AppAlert.alert('Búsqueda', 'No se encontró esa dirección en Chile.');
      }
    } catch {
      AppAlert.alert('Búsqueda', 'Error al buscar la dirección.');
    } finally {
      setSuggestLoading(false);
      setIsTyping(false);
      setSuggestions([]);
    }
  };

  // ===== Precisión máxima del marcador =====
  const onRegionChangeComplete = useCallback((region: Region) => {
    // Actualiza el centro y la dirección con máxima precisión al mover el marcador
    setCenter({ latitude: Number(region.latitude), longitude: Number(region.longitude) });
    if (isTyping) return;
    if (revTimerRef.current) clearTimeout(revTimerRef.current);
    // Sin delay, siempre usa el centro exacto
    doReverseForRegion(region);
  }, [isTyping]);

  async function animateTo(lat: number, lon: number, zoom = 19, duration = 250) {
    try {
      const anyMap: any = mapRef.current;
      if (!anyMap) return;
      if (anyMap.animateCamera) {
        await anyMap.animateCamera(
          { center: { latitude: lat, longitude: lon }, zoom: zoom },
          { duration }
        );
      } else if (anyMap.animateToRegion) {
        anyMap.animateToRegion(
          { latitude: lat, longitude: lon, latitudeDelta: 0.0005, longitudeDelta: 0.0005 },
          duration
        );
      } else {
        anyMap.setRegion?.({
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.0005,
          longitudeDelta: 0.0005,
        });
      }
      setCenter({ latitude: lat, longitude: lon });
    } catch {}
  }

  const centerToMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        AppAlert.alert('Ubicación', 'Permiso denegado para acceder a la ubicación.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const { latitude, longitude } = pos.coords;
      await animateTo(latitude, longitude, 19);
      try {
        const places = await Location.reverseGeocodeAsync({ latitude, longitude });
        const p = places?.[0] ?? null;
        if (p) setSearchText(formatReverseAddress(p));
      } catch {}
    } catch {
      AppAlert.alert('Ubicación', 'No se pudo centrar en tu ubicación.');
    }
  };

  const doReverseForRegion = useCallback(async (region: Region) => {
    setRevLoading(true);
    try {
      // Siempre usa el centro exacto del mapa
      const places = await Location.reverseGeocodeAsync({
        latitude: region.latitude,
        longitude: region.longitude,
      });
      const p = places?.[0] ?? null;
      // Solo actualiza el texto si no está cargando
      if (p && !suggestLoading) setSearchText(formatReverseAddress(p));
    } catch {
      // ignore
    } finally {
      setRevLoading(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Navbar */}
      <View style={[styles.navbar, { height: NAV_HEIGHT, paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => {
            try { router.replace('/citizen/citizenReport'); } catch {}
          }}
          style={styles.navBtn}
          accessibilityRole="button"
        >
          <IconSymbol name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.navTitleWrap, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
          <IconSymbol name="edit-location-alt" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.navTitle}>Editar ubicación</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Search bar */}
      <View style={[styles.searchRow, { top: NAV_HEIGHT + 8, height: SEARCH_H }]}>
        <View style={styles.searchLeft}><IconSymbol name="search" size={20} color="#999" /></View>
        {(suggestLoading || revLoading) ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', height: SEARCH_H }}>
            <ActivityIndicator size="small" color="#0A4A90" />
          </View>
        ) : (
          <TextInput
            ref={searchRef}
            value={searchText}
            onFocus={() => setIsTyping(true)}
            onBlur={() => setTimeout(() => setIsTyping(false), 150)}
            onChangeText={(t) => { setSearchText(t); setIsTyping(true); }}
            onSubmitEditing={(e) => runFreeSearch(e.nativeEvent.text)}
            placeholder="Buscar dirección…"
            placeholderTextColor="#999"
            style={styles.searchInput}
            returnKeyType="search"
          />
        )}
        <View style={styles.searchRight}>
          {searchText && !suggestLoading && !revLoading ? (
            <TouchableOpacity
              onPress={() => { setSearchText(''); setSuggestions([]); setIsTyping(true); searchRef.current?.focus(); }}
              style={styles.iconBtn}
              accessibilityLabel="Borrar búsqueda"
            >
              <IconSymbol name="close" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
        {/* El loading ya se muestra en el centro, no repetir aquí */}
      </View>

      {/* Suggestions */}
      {isTyping && suggestions.length > 0 && (
        <View style={[styles.suggestions, { top: NAV_HEIGHT + 8 + SEARCH_H + 6, zIndex: 9999 }]}>
          <FlatList
            data={suggestions}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(i) => `${i.label}-${i.lat ?? '0'}-${i.lon ?? '0'}`}
            initialNumToRender={8}
            windowSize={5}
            removeClippedSubviews
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestItem} onPress={() => onSelectSuggestion(item)}>
                <Text numberOfLines={2}>{item.label}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={suggestLoading ? <ActivityIndicator size="small" color="#0A4A90" style={{ margin: 12 }} /> : null}
          />
        </View>
      )}

      {/* Map */}
      <View style={[styles.mapWrap, { marginTop: NAV_HEIGHT, marginBottom: tabBarHeightLocal + 4 }]} pointerEvents="box-none">
        {center ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{ latitude: center.latitude, longitude: center.longitude, latitudeDelta: 0.0005, longitudeDelta: 0.0005 }}
            onMapReady={async () => {
              setMapReady(true);
              if (center && !didInitialCamera.current) {
                didInitialCamera.current = true;
                await animateTo(center.latitude, center.longitude, 19, 0);
              }
            }}
            onRegionChange={() => {
              if (isTyping) {
                setIsTyping(false);
                setSuggestions([]);
                Keyboard.dismiss();
              }
            }}
            onRegionChangeComplete={onRegionChangeComplete}
            showsMyLocationButton={false}
          />
        ) : (
          <View style={styles.mapPlaceholder}><ActivityIndicator size="large" color="#0A4A90" /></View>
        )}

        {/* Marker fijo al centro */}
        <View pointerEvents="none" style={styles.centerMarkerWrap}>
          <IconSymbol name="edit-location-alt" size={48} color="#0A4A90" />
        </View>

        {/* FAB centrar en mi ubicación */}
        <TouchableOpacity style={[styles.centerFab, { bottom: tabBarHeightLocal + footerHeight + 12 }]} onPress={centerToMyLocation} accessibilityLabel="Centrar ubicación">
          <IconSymbol name="my-location" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)} style={[styles.footer, { bottom: tabBarHeightLocal + 8 }]}>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => {
            const basePayload = { ubicacionTexto: searchText, coords: { x: center?.latitude, y: center?.longitude } };
            AppAlert.alert('Confirmar', '¿Guardar ubicación seleccionada?', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Guardar',
                onPress: async () => {
                  try {
                    let full = basePayload.ubicacionTexto ?? '';
                    if (center) {
                      try {
                        const places = await Location.reverseGeocodeAsync({ latitude: center.latitude, longitude: center.longitude });
                        const p = places?.[0] ?? null;
                        if (p) {
                          const pp: any = p as any;
                          let streetRaw = (pp.street || pp.name || '').trim();
                          let number = '';
                          if (pp.name && /^\d+$/.test(String(pp.name).trim())) {
                            number = String(pp.name).trim();
                            streetRaw = (pp.street || '').trim();
                          } else {
                            const mNameNum = String(pp.name || '').trim().match(/(\d+)$/);
                            if (mNameNum && pp.street) {
                              number = mNameNum[1];
                              streetRaw = (pp.street || '').trim();
                            } else {
                              const mStreetNum = streetRaw.match(/^(.*?)[,\s]+(\d+)\s*$/);
                              if (mStreetNum) {
                                streetRaw = (mStreetNum[1] || '').trim();
                                number = mStreetNum[2] || '';
                              }
                            }
                          }
                          streetRaw = streetRaw
                            .replace(/^\s*(Av\.?|Av)\s+/i, 'Avenida ')
                            .replace(/^\s*(C\.?|Calle|C)\s+/i, 'Calle ')
                            .replace(/^\s*(Pje\.?|Pje)\s+/i, 'Pasaje ')
                            .replace(/^\s*(Gral\.?|Gral)\s+/i, 'General ')
                            .replace(/^\s*(Bv\.?|Bvar\.?|Bulevar|Bulev)\s+/i, 'Bulevar ');

                          const streetAndNumber = [streetRaw, number].filter(Boolean).join(' ').trim();
                          const postalCity = [pp.postalCode, pp.city || pp.town || pp.village || pp.county || pp.municipality].filter(Boolean).join(' ').trim();
                          const region = pp.region || '';
                          const composed = [streetAndNumber, postalCity, region].filter(Boolean).join(', ').trim();
                          if (composed) full = composed;
                        }
                      } catch (e) {}
                    }
                    const payload = { ubicacionTexto: full, coords: basePayload.coords };
                    try { const prev = getReportFormSnapshot() || {}; setReportFormSnapshot({ ...prev, ...payload }); } catch {}
                    try { invokeLocationEdit(payload); } catch {}
                    try { router.replace('/citizen/citizenReport'); } catch {}
                  } catch (err) {
                    console.warn('Guardar ubicación falló', err);
                  }
                },
              },
            ]);
          }}
        >
          <Text style={styles.saveTxt}>Guardar mi dirección</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  navbar: { position: 'absolute', left: 0, right: 0, height: 64, backgroundColor: '#0A4A90', zIndex: 120, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  navBtn: { padding: 8 },
  navTitleWrap: { flexDirection: 'row', alignItems: 'center', marginLeft: 6 },
  navTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },

  searchRow: { position: 'absolute', left: 12, right: 12, height: 44, zIndex: 130, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  searchLeft: { width: 36, alignItems: 'center', justifyContent: 'center' },
  searchInput: { flex: 1, height: '100%' },
  searchRight: { width: 44, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { padding: 6 },

  suggestions: { position: 'absolute', left: 12, right: 12, maxHeight: 260, backgroundColor: '#fff', borderRadius: 10, zIndex: 135, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  suggestItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },

  mapWrap: { flex: 1, marginTop: 0 },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  centerMarkerWrap: { position: 'absolute', left: 0, right: 0, top: '50%', marginTop: -24, alignItems: 'center', zIndex: 140 },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: 'transparent', zIndex: 140 },
  saveBtn: { backgroundColor: '#0A4A90', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveTxt: { color: '#fff', fontWeight: '700' },

  centerFab: { position: 'absolute', right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0A4A90', alignItems: 'center', justifyContent: 'center', zIndex: 200, elevation: 8 },
  searchLoaderOverlay: { position: 'absolute', left: 56, right: 56, top: 6, bottom: 6, alignItems: 'center', justifyContent: 'center', zIndex: 200, pointerEvents: 'none' as any },
});