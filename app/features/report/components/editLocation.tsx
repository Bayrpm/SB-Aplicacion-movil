import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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

type SuggestItem = { label: string; lat: number; lon: number; score: number; src: 'photon' | 'nominatim' };

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

  // BBOX Gran Santiago (aprox — minlon,minlat,maxlon,maxlat)
  const STGO_BBOX = { minlon: -71.20, minlat: -33.95, maxlon: -70.35, maxlat: -33.15 };

  // Search / suggestions
  const [searchText, setSearchText] = useState(qAddr ? sanitizeShort(qAddr) : '');
  const searchRef = useRef<TextInput | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Abort & cache
  const abortPhoton = useRef<AbortController | null>(null);
  const abortNominatim = useRef<AbortController | null>(null);
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
    const street = p?.street || p?.name || '';
    const number = p?.streetNumber || (p?.name && p?.name !== street ? p.name : '');
    const streetPart = street ? `${street}${number ? ` ${number}` : ''}` : '';
    const comuna =
      p?.city || p?.town || p?.village || p?.municipality || p?.county || p?.district || 'Santiago';
    return sanitizeShort([streetPart, comuna].filter(Boolean).join(', ')) || 'Mi ubicación';
  }

  function applySynonyms(q: string): string[] {
    const base = q.trim();
    const out = new Set<string>([base]);

    // Gran Avenida → Gran Avenida José Miguel Carrera
    if (/^\s*gran\s+avenida(\b|$)/i.test(base)) {
      out.add(base.replace(/^\s*gran\s+avenida/i, 'Gran Avenida José Miguel Carrera'));
    }

    // Si parece “calle + número” sin tipo, probamos tipos comunes
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
  const photonUrl = (q: string) => {
    const base = 'https://photon.komoot.io/api';
    const params: Record<string, string> = {
      q,
      lang: 'es',
      limit: '12',
      // Sesgo local: si tenemos centro, úsalo; si no, usar el centro de Santiago aprox
      lat: String(center?.latitude ?? -33.45),
      lon: String(center?.longitude ?? -70.6667),
    };
    const qs = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    return `${base}?${qs}`;
  };

  async function fetchPhoton(q: string, signal?: AbortSignal): Promise<SuggestItem[]> {
    const url = photonUrl(q);
    const resp = await fetch(url, { signal } as any);
    if (!resp.ok) return [];
    const json = await resp.json();
    const feats: any[] = json?.features || [];
    const tokens = q.toLowerCase().split(/[\s,]+/).filter((t: string) => t.length > 1);
    const out: SuggestItem[] = [];

    for (const f of feats) {
      const p = f.properties || {};
      const lat = f.geometry?.coordinates?.[1];
      const lon = f.geometry?.coordinates?.[0];

      const road = p.street || p.name || p.road || '';
      const number = p.housenumber || p.house_number || '';
      // Comuna/ciudad
      const comuna = p.city || p.town || p.village || p.district || p.county || p.municipality || 'Santiago';

      if (!road && !p.name) continue;
      const street = road ? `${road}${number ? ` ${number}` : ''}` : p.name;
      if (!street) continue;

      const label = ensureComuna(sanitizeShort([street, comuna].filter(Boolean).join(', ')), comuna);
      const score = scoreByQuery(label, tokens, lat, lon);
      out.push({ label, lat, lon, score, src: 'photon' });
    }

    // Desduplicar por label
    const seen = new Set<string>();
    const unique = out.filter((i) => {
      if (seen.has(i.label)) return false;
      seen.add(i.label);
      return true;
    });

    unique.sort((a, b) => b.score - a.score);
    return unique;
  }

  function nominatimSearchUrls(raw: string): string[] {
    const base = 'https://nominatim.openstreetmap.org/search';
    const common = `format=json&addressdetails=1&limit=12&countrycodes=cl&autocomplete=1`;
    const vb = `${STGO_BBOX.minlon},${STGO_BBOX.minlat},${STGO_BBOX.maxlon},${STGO_BBOX.maxlat}`;
    const headers = [
      `${base}?${common}&q=${encodeURIComponent(raw)}&viewbox=${vb}&bounded=1`,
      `${base}?${common}&q=${encodeURIComponent(raw)}`,
    ];

    // structured si parece calle + número (, comuna)
    const m = raw.match(/^(.+?)\s+(\d+)\s*(?:,\s*(.+))?$/i);
    if (m) {
      const street = `${m[1]} ${m[2]}`;
      const city = (m[3] || 'Santiago').trim();
      headers.unshift(`${base}?${common}&street=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}`);
    }
    return headers;
  }

  async function fetchNominatim(raw: string, signal?: AbortSignal): Promise<SuggestItem[]> {
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
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  // ===== Ubicación inicial =====
  useEffect(() => {
    (async () => {
      try {
        if (center) return; // venía por params
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
          await animateTo(latitude, longitude, 18, 0);
        }
      } catch {
        AppAlert.alert('Ubicación', 'No se pudo obtener la ubicación.');
      }
    })();
  }, [mapReady]);

  useEffect(() => {
    if (qAddr) setSearchText(sanitizeShort(qAddr));
  }, [qAddr]);

  // ====== AUTOCOMPLETADO (Photon rápido + Nominatim) ======
  const runAutocomplete = async (text: string) => {
    const q = text.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }

    // Cache
    const cacheKey = `${q}|${Math.round(center?.latitude ?? -33.45,)}|${Math.round(center?.longitude ?? -70.67)}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setSuggestions(cached);
    }

    // Cancela peticiones previas
    try { abortPhoton.current?.abort(); } catch {}
    try { abortNominatim.current?.abort(); } catch {}
    abortPhoton.current = new AbortController();
    abortNominatim.current = new AbortController();

    setSuggestLoading(true);

    // 1) Photon (rápido)
    let photonItems: SuggestItem[] = [];
    try {
      photonItems = await fetchPhoton(q, abortPhoton.current.signal);
      if (photonItems.length > 0) setSuggestions(photonItems);
    } catch {}

    // 2) Nominatim (en paralelo, fusiona y mejora cobertura)
    try {
      const nominatimItems = await fetchNominatim(q, abortNominatim.current.signal);
      const merged = mergeUnique(photonItems, nominatimItems).slice(0, 12);
      setSuggestions(merged);
      cacheRef.current.set(cacheKey, merged);
    } catch {
      // si falla, nos quedamos con photon
      if (photonItems.length === 0) setSuggestions([]);
    } finally {
      setSuggestLoading(false);
    }
  };

  const mergeUnique = (a: SuggestItem[], b: SuggestItem[]) => {
    const out: SuggestItem[] = [];
    const seen = new Set<string>();
    [...a, ...b].forEach((i) => {
      if (!seen.has(i.label)) {
        seen.add(i.label);
        out.push(i);
      }
    });
    out.sort((x, y) => y.score - x.score);
    return out;
  };

  useEffect(() => {
    if (!isTyping) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runAutocomplete(searchText);
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText, isTyping]);

  const onSelectSuggestion = async (item: SuggestItem) => {
    Keyboard.dismiss();
    setIsTyping(false);
    setSuggestions([]);
    setSearchText(item.label);
    await animateTo(item.lat, item.lon, 18);
  };

  const runFreeSearch = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    try {
      setSuggestLoading(true);
      // Primero intenta combo
      await runAutocomplete(q);
      const items = cacheRef.current.get(`${q}|${Math.round(center?.latitude ?? -33.45)}|${Math.round(center?.longitude ?? -70.67)}`) || suggestions;
      if (items && items[0]) {
        setSearchText(items[0].label);
        await animateTo(items[0].lat, items[0].lon, 18);
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

  // ===== Sync barra al mover el mapa =====
  const doReverseForRegion = async (region: Region) => {
    setRevLoading(true);
    try {
      const places = await Location.reverseGeocodeAsync({
        latitude: region.latitude,
        longitude: region.longitude,
      });
      const p = places?.[0] ?? null;
      if (p) setSearchText(formatReverseAddress(p));
    } catch {
      // ignore
    } finally {
      setRevLoading(false);
    }
  };

  const onRegionChangeComplete = (region: Region) => {
    setCenter({ latitude: region.latitude, longitude: region.longitude });
    if (isTyping) return;
    if (revTimerRef.current) clearTimeout(revTimerRef.current);
    revTimerRef.current = setTimeout(() => doReverseForRegion(region), 200);
  };

  async function animateTo(lat: number, lon: number, zoom = 18, duration = 300) {
    try {
      const anyMap: any = mapRef.current;
      if (!anyMap) return;
      if (anyMap.animateCamera) {
        await anyMap.animateCamera(
          { center: { latitude: lat, longitude: lon }, zoom },
          { duration }
        );
      } else if (anyMap.animateToRegion) {
        anyMap.animateToRegion(
          { latitude: lat, longitude: lon, latitudeDelta: 0.0015, longitudeDelta: 0.0015 },
          duration
        );
      } else {
        anyMap.setRegion?.({
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.0015,
          longitudeDelta: 0.0015,
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
      await animateTo(latitude, longitude, 18);
      try {
        const places = await Location.reverseGeocodeAsync({ latitude, longitude });
        const p = places?.[0] ?? null;
        if (p) setSearchText(formatReverseAddress(p));
      } catch {}
    } catch {
      AppAlert.alert('Ubicación', 'No se pudo centrar en tu ubicación.');
    }
  };

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
        <View style={styles.searchRight}>
          {suggestLoading || revLoading ? (
            <ActivityIndicator color="#0A4A90" />
          ) : searchText ? (
            <TouchableOpacity
              onPress={() => { setSearchText(''); setSuggestions([]); setIsTyping(true); searchRef.current?.focus(); }}
              style={styles.iconBtn}
              accessibilityLabel="Borrar búsqueda"
            >
              <IconSymbol name="close" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Suggestions */}
      {isTyping && suggestions.length > 0 && (
        <View style={[styles.suggestions, { top: NAV_HEIGHT + 8 + SEARCH_H + 6, zIndex: 9999 }]}>
          <FlatList
            data={suggestions}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(i) => `${i.label}-${i.lat}-${i.lon}`}
            initialNumToRender={8}
            windowSize={5}
            removeClippedSubviews
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestItem} onPress={() => onSelectSuggestion(item)}>
                <Text numberOfLines={2}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Map */}
      <View style={[styles.mapWrap, { marginTop: NAV_HEIGHT, marginBottom: tabBarHeightLocal + 4 }]} pointerEvents="box-none">
        {center ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{ latitude: center.latitude, longitude: center.longitude, latitudeDelta: 0.0015, longitudeDelta: 0.0015 }}
            onMapReady={async () => {
              setMapReady(true);
              if (center && !didInitialCamera.current) {
                didInitialCamera.current = true;
                await animateTo(center.latitude, center.longitude, 18, 0);
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
            // Importante: NO mostrar el dot azul
            // showsUserLocation
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
                    // Try to enrich with postal code and region via reverse geocode
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
                      } catch (e) {
                        // ignore reverse errors
                      }
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
});
