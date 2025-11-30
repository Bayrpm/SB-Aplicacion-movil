import ReportCard from '@/app/features/profileCitizen/components/reportCard';
// Use report detail modal from the `report` feature (public report detail UI)
import ReportDetailModal from '@/app/features/report/components/reportDetailModal';
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { RealtimeChannel } from '@supabase/supabase-js';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchPublicReportsFeed, subscribeToPublicReports, unsubscribeFromPublicReports } from '../api/feed.api';

import type { CitizenReport } from '@/app/features/profileCitizen/api/profile.api';

const INITIAL_LIMIT = 3;
const RADIUS_METERS = 200;
const MAX_AGE_HOURS = 24;

// Haversine en metros
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (d: number) => d * Math.PI / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function PublicReportsFeed() {
  const { fontSize } = useFontSize();
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedReport, setSelectedReport] = useState<CitizenReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Cuando true, la suscripción ignorará (o bufferizará) eventos entrantes.
  const suspendSubscriptionRef = useRef(false);
  // Evitar recargas concurrentes que puedan provocar parpadeo
  const isLoadingRef = useRef(false);

  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const buttonBg = useThemeColor({ light: 'transparent', dark: '#0A4A90' }, 'tint');
  const buttonText = useThemeColor({ light: '#0A4A90', dark: '#FFFFFF' }, 'tint');

  // Obtener ubicación del usuario
  const getUserLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(true);
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: loc.coords.latitude, lon: loc.coords.longitude };
      setUserLocation(coords);
      setLocationError(false);
      return coords;
    } catch (e) {
      setLocationError(true);
      return null;
    }
  }, []);

  // Cargar denuncias públicas cercanas usando API
  const loadPublicReports = useCallback(async (limit: number, coords?: { lat: number; lon: number } | null) => {
    try {
      // Verificar conectividad
      const st = await Network.getNetworkStateAsync();
      const connected = !!st.isConnected && st.isInternetReachable !== false;
      if (!connected) {
        setNetworkError(true);
        return { data: [], hasMore: false };
      }

      // Si no hay coordenadas, obtenerlas
      const location = coords ?? userLocation ?? await getUserLocation();
      if (!location) {
        setLocationError(true);
        return { data: [], hasMore: false };
      }

      const { data, hasMore, error } = await fetchPublicReportsFeed({
        limit,
        coords: location,
        maxAgeHours: MAX_AGE_HOURS,
        radiusMeters: RADIUS_METERS,
      });
      if (error) {
        setNetworkError(true);
        return { data: [], hasMore: false };
      }
      setNetworkError(false);
      return { data, hasMore };
    } catch (e) {
      setNetworkError(true);
      return { data: [], hasMore: false };
    }
  }, [userLocation, getUserLocation]);

  // Cargar inicial y activar suscripción
  const loadInitial = useCallback(async (manual = false) => {
    // Protegemos contra reentradas
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    // Si es recarga manual y ya tenemos datos, usamos `refreshing` para
    // no ocultar el contenido existente con el spinner de carga completo.
    if (manual && reports.length > 0) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
  // loadInitial start
    setNetworkError(false);
    setLocationError(false);

  // Suspender temporalmente la suscripción para evitar que los eventos
  // en vuelo durante la recarga causen re-renders / parpadeo.
  // Si es recarga manual, usamos una ventana más corta.
  suspendSubscriptionRef.current = true;

    const coords = await getUserLocation();
    if (!coords) {
      setLoading(false);
      isLoadingRef.current = false;
      // reanudar suscripción con pequeña latencia
      setTimeout(() => { suspendSubscriptionRef.current = false; }, 600);
      // aborted: no coords
      return;
    }

  const { data, hasMore } = await loadPublicReports(INITIAL_LIMIT, coords);
    // Evitar reemplazar el estado si los datos son iguales para evitar re-renders innecesarios
    setReports((prev) => {
      try {
        if (JSON.stringify(prev) === JSON.stringify(data)) {
          return prev;
        }
      } catch (_) {
        // en caso de error stringify, continuar y reemplazar
      }
      return data;
    });
    setHasMore(hasMore);
    setShowAll(false);
    if (manual && reports.length > 0) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  isLoadingRef.current = false;
  // loadInitial finished

    // Activar suscripción en tiempo real después de la carga inicial
    setIsSubscribed(true);

    // reanudar suscripción después de una ventana corta para permitir que
    // la UI se estabilice (evita que los eventos que llegan justo después
    // del fetch provoquen parpadeo). Si es manual, reanudamos más rápido.
    setTimeout(() => { suspendSubscriptionRef.current = false; }, manual ? 700 : 1200);
  }, [getUserLocation, loadPublicReports]);

  // Ejecutar carga inicial automáticamente al montar el componente
  useEffect(() => {
    // Llamamos a loadInitial una sola vez al montar
    loadInitial().catch(() => {
      // ignore errors here; estados locales ya manejan errores
    });
  }, [loadInitial]);

  // Cargar todas
  const loadAll = useCallback(async () => {
    // Protegemos contra recentradas
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoadingMore(true);
    // Suspender suscripción durante loadAll para evitar churn
    suspendSubscriptionRef.current = true;
    const { data, hasMore } = await loadPublicReports(9999); // sin límite práctico
    setReports((prev) => {
      try {
        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
      } catch (_) {}
      return data;
    });
    setHasMore(false);
    setShowAll(true);
    setLoadingMore(false);
    isLoadingRef.current = false;
  setTimeout(() => { suspendSubscriptionRef.current = false; }, 1200);
  // loadAll finished
  }, [loadPublicReports]);

  // Ver menos (volver a las 3 iniciales)
  const handleShowLess = useCallback(() => {
    setReports(prev => prev.slice(0, INITIAL_LIMIT));
    setHasMore(true);
    setShowAll(false);
  }, []);

  const handleReportPress = useCallback((report: CitizenReport) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  }, []);

  const handleToggleLike = useCallback(() => {
    // TODO: Implementar funcionalidad de like
    // debug removed
  }, [selectedReport]);

  // Verificar si un reporte está dentro del rango
  const isReportInRange = useCallback((report: any): boolean => {
    if (!userLocation) return false;
    if (!report.coords_x || !report.coords_y) return false;
    const distance = haversineDistance(
      userLocation.lat,
      userLocation.lon,
      report.coords_x,
      report.coords_y
    );
    return distance <= RADIUS_METERS;
  }, [userLocation]);

  // Mapear reporte raw a CitizenReport
  const mapReportToCitizen = useCallback((raw: any): CitizenReport => {
    return {
      id: String(raw.id),
      folio: raw.folio ?? null,
      titulo: raw.titulo ?? '',
      descripcion: raw.descripcion ?? '',
      ubicacion_texto: raw.ubicacion_texto ?? null,
      coords_x: Number(raw.coords_x),
      coords_y: Number(raw.coords_y),
      fecha_creacion: raw.fecha_creacion,
      anonimo: !!raw.anonimo,
      categoria_publica_id: raw.categoria_publica_id ?? null,
      categoria: null,
      estado: null,
      estado_id: raw.estado_id ?? null,
      ciudadano: raw.anonimo ? null : (raw.ciudadano ?? null),
    };
  }, []);

  // Suscripción en tiempo real
  useEffect(() => {
    if (!isSubscribed || !userLocation) return;

    // Helper to compare reports quickly
    const reportsEqual = (a: CitizenReport | null | undefined, b: CitizenReport | null | undefined) => {
      try {
        return JSON.stringify(a) === JSON.stringify(b);
      } catch (_) {
        return false;
      }
    };

    // Buffer events and apply in batch to reduce rapid re-renders/flicker
    const queuedAdds: Map<string, any> = new Map();
    const queuedUpdates: Map<string, any> = new Map();
    const queuedDeletes: Map<string, true> = new Map();
    const lastApplied: Map<string, string> = new Map(); // store last applied payload hash per id

    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleFlush = () => {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(() => {
        // Apply batched changes
        setReports((prev) => {
          let next = [...prev];

          // Apply deletes first
          if (queuedDeletes.size > 0) {
            const deleteIds = Array.from(queuedDeletes.keys());
            next = next.filter(r => !deleteIds.includes(r.id));
          }

          // Apply updates
          queuedUpdates.forEach((mapped, id) => {
            const idx = next.findIndex(r => r.id === id);
            if (idx === -1) {
              // Not present, insert at top
              next = [mapped, ...next];
            } else {
              // Replace only if different
              try {
                if (JSON.stringify(next[idx]) !== JSON.stringify(mapped)) {
                  next[idx] = mapped;
                }
              } catch (_) {
                next[idx] = mapped;
              }
            }
          });

          // Apply adds (new items) — ensure not duplicated; maintain original order (newest first)
          const addIds = Array.from(queuedAdds.keys());
          for (let i = addIds.length - 1; i >= 0; i--) {
            const id = addIds[i];
            const mapped = queuedAdds.get(id);
            if (!next.some(r => r.id === id)) {
              next = [mapped, ...next];
            }
          }

          // Clear queues
          queuedAdds.clear();
          queuedUpdates.clear();
          queuedDeletes.clear();

          return next;
        });
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
      }, 800);
    };

    const logEvent = (type: string, payloadSummary: any) => {
      // Small, informative debug log to inspect event flux during development
      try {
        const short = typeof payloadSummary === 'string' ? payloadSummary.slice(0, 200) : JSON.stringify(payloadSummary).slice(0, 200);
        // Use console.debug so logs can be filtered in debug builds
        // eslint-disable-next-line no-console
} catch (_) {
        // ignore logging errors
      }
    };

    const channel = subscribeToPublicReports(
      // onNewReport: enqueue if in range
      (newReport: any) => {
        if (suspendSubscriptionRef.current) {
          // eslint-disable-next-line no-console
return;
        }
        if (!isReportInRange(newReport)) return;
        const mapped = mapReportToCitizen(newReport);
        const payloadHash = JSON.stringify(mapped);
        const last = lastApplied.get(mapped.id);
        // If identical to last applied, skip enqueuing
        if (last === payloadHash) {
          logEvent('skip-new(same)', { id: mapped.id });
          return;
        }
        logEvent('new', { id: mapped.id, title: mapped.titulo });
        queuedAdds.set(mapped.id, mapped);
        // ensure we don't have stale delete queued
        if (queuedDeletes.has(mapped.id)) queuedDeletes.delete(mapped.id);
        // update lastApplied to avoid immediate duplicates
        lastApplied.set(mapped.id, payloadHash);
        scheduleFlush();
      },
      // onUpdateReport: enqueue update
      (updatedReport: any) => {
        if (suspendSubscriptionRef.current) {
          // eslint-disable-next-line no-console
return;
        }
        if (!isReportInRange(updatedReport)) {
          // enqueue delete
          queuedDeletes.set(String(updatedReport.id), true as true);
          // also remove any pending adds/updates
          if (queuedAdds.has(String(updatedReport.id))) queuedAdds.delete(String(updatedReport.id));
          if (queuedUpdates.has(String(updatedReport.id))) queuedUpdates.delete(String(updatedReport.id));
          logEvent('delete-enqueue', { id: String(updatedReport.id) });
          scheduleFlush();
          return;
        }

        const mapped = mapReportToCitizen(updatedReport);
        const payloadHash = JSON.stringify(mapped);
        const last = lastApplied.get(mapped.id);
        if (last === payloadHash) {
          logEvent('skip-update(same)', { id: mapped.id });
          return;
        }
        logEvent('update', { id: mapped.id, title: mapped.titulo });
        queuedUpdates.set(mapped.id, mapped);
        // If it was in adds, replace it
        if (queuedAdds.has(mapped.id)) queuedAdds.set(mapped.id, mapped);
        lastApplied.set(mapped.id, payloadHash);
        scheduleFlush();
      },
      // onDeleteReport: enqueue delete
      (reportId: string) => {
        if (suspendSubscriptionRef.current) {
          // eslint-disable-next-line no-console
return;
        }
        queuedDeletes.set(reportId, true as true);
        // also remove any pending adds/updates
        if (queuedAdds.has(reportId)) queuedAdds.delete(reportId);
        if (queuedUpdates.has(reportId)) queuedUpdates.delete(reportId);
        lastApplied.delete(reportId);
        logEvent('delete', { id: reportId });
        scheduleFlush();
      }
    );

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        unsubscribeFromPublicReports(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isSubscribed, userLocation, isReportInRange, mapReportToCitizen]);

  return (
    <>
      <View style={styles.container}>
        {/* Título con botón Actualizar */}
        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 22) }]}>Denuncias</Text>
          <TouchableOpacity
            style={[
              styles.refreshButton,
              { backgroundColor: buttonBg, borderColor: accentColor, opacity: (loading || refreshing) ? 0.6 : 1 },
            ]}
            onPress={() => loadInitial(true)}
            activeOpacity={0.7}
            disabled={loading || refreshing}
          >
            <IconSymbol name="refresh" size={18} color={buttonText} />
            <Text style={[styles.refreshText, { color: buttonText, fontSize: getFontSizeValue(fontSize, 13) }]}>Actualizar</Text>
          </TouchableOpacity>
        </View>

        {/* Subtítulo descriptivo */}
        <Text style={[styles.subtitle, { color: iconColor, fontSize: getFontSizeValue(fontSize, 14) }]}> 
          Reportes públicos cerca de ti en las últimas 24 horas{isSubscribed && ' • Actualizaciones en tiempo real'}
        </Text>

        {/* Spinner durante carga */}
        {loading && (
          <View style={[styles.centerContainer, { minHeight: 200 }]}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={[styles.loadingText, { color: iconColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
              Cargando denuncias cercanas...
            </Text>
          </View>
        )}

        {/* Mensaje inicial o estado vacío */}
        {!loading && reports.length === 0 && !networkError && !locationError && (
          <View style={[styles.emptyContainer, { minHeight: 200 }]}>
            <IconSymbol name="description" size={48} color={iconColor} />
            <Text style={[styles.emptyTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 18) }]}>
              No hay denuncias cercanas
            </Text>
            <Text style={[styles.emptySubtitle, { color: iconColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
              Toca "Actualizar" para cargar reportes públicos cerca de ti
            </Text>
          </View>
        )}

        {/* Error de ubicación */}
        {locationError && reports.length === 0 && !loading && (
          <View style={[styles.centerContainer, { minHeight: 200 }]}>
            <IconSymbol name="location-off" size={48} color="#EF4444" />
            <Text style={[styles.errorTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 18) }]}>
              Ubicación no disponible
            </Text>
            <Text style={[styles.errorSubtitle, { color: iconColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
              Activa los permisos de ubicación para ver denuncias cercanas
            </Text>
          </View>
        )}

        {/* Error de red */}
        {networkError && reports.length === 0 && !loading && (
          <View style={[styles.centerContainer, { minHeight: 200 }]}>
            <IconSymbol name="wifi-off" size={48} color="#EF4444" />
            <Text style={[styles.errorTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 18) }]}>
              Sin conexión a la red
            </Text>
            <Text style={[styles.errorSubtitle, { color: iconColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
              No se pudieron cargar las denuncias
            </Text>
          </View>
        )}

        {/* Lista de denuncias */}
        {!loading && reports.length > 0 ? (
          <>
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onPress={() => handleReportPress(report)}
              />
            ))}

            {/* Botón Ver más: abrir modal */}
            {hasMore && !showAll && (
              <TouchableOpacity
                style={[
                  styles.loadMoreButton,
                  {
                    backgroundColor: buttonBg,
                    borderColor: accentColor,
                  },
                ]}
                onPress={() => setShowAll(true)}
                disabled={loadingMore}
                activeOpacity={0.7}
              >
                <Text style={[styles.loadMoreText, { color: buttonText, fontSize: getFontSizeValue(fontSize, 15) }]}>Ver más</Text>
              </TouchableOpacity>
            )}

            {/* Modal de lista completa */}
            {showAll && (
              <Modal
                visible={showAll}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowAll(false)}
              >
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: accentColor }}>Denuncias cercanas</Text>
                    <TouchableOpacity onPress={() => setShowAll(false)}>
                      <IconSymbol name="close" size={28} color={accentColor} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                    {reports.map((report) => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        onPress={() => {
                          setSelectedReport(report);
                          setShowDetailModal(true);
                        }}
                      />
                    ))}
                  </ScrollView>
                </View>
              </Modal>
            )}
          </>
        ) : null}
      </View>

      {/* Modal de detalle */}
      <ReportDetailModal
        visible={showDetailModal}
        reportId={selectedReport ? String(selectedReport.id) : null}
        onClose={() => setShowDetailModal(false)}
      />
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

// ...existing code...

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0A4A90',
    backgroundColor: '#fff',
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  centerContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadMoreButton: {
    marginTop: 12,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
