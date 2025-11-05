import ReportCard from '@/app/features/profileCitizen/components/reportCard';
import ReportDetailModal from '@/app/features/profileCitizen/components/reportDetailModal';
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
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setNetworkError(false);
    setLocationError(false);

    const coords = await getUserLocation();
    if (!coords) {
      setLoading(false);
      return;
    }

    const { data, hasMore } = await loadPublicReports(INITIAL_LIMIT, coords);
    setReports(data);
    setHasMore(hasMore);
    setShowAll(false);
    setLoading(false);
    
    // Activar suscripción en tiempo real después de la carga inicial
    setIsSubscribed(true);
  }, [getUserLocation, loadPublicReports]);

  // Cargar todas
  const loadAll = useCallback(async () => {
    setLoadingMore(true);
    const { data, hasMore } = await loadPublicReports(9999); // sin límite práctico
    setReports(data);
    setHasMore(false);
    setShowAll(true);
    setLoadingMore(false);
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

    const channel = subscribeToPublicReports(
      // onNewReport: agregar si está en rango
      (newReport: any) => {
        if (!isReportInRange(newReport)) return;
        const mapped = mapReportToCitizen(newReport);
        setReports((prev) => {
          // Evitar duplicados
          if (prev.some(r => r.id === mapped.id)) return prev;
          // Insertar al principio (más reciente primero)
          return [mapped, ...prev];
        });
      },
      // onUpdateReport: actualizar si existe
      (updatedReport: any) => {
        if (!isReportInRange(updatedReport)) {
          // Si ya no está en rango, eliminarlo
          setReports((prev) => prev.filter(r => r.id !== String(updatedReport.id)));
          return;
        }
        const mapped = mapReportToCitizen(updatedReport);
        setReports((prev) => {
          const idx = prev.findIndex(r => r.id === mapped.id);
          if (idx === -1) {
            // No existe, agregarlo
            return [mapped, ...prev];
          }
          // Existe, actualizarlo
          const updated = [...prev];
          updated[idx] = mapped;
          return updated;
        });
      },
      // onDeleteReport: eliminar si existe
      (reportId: string) => {
        setReports((prev) => prev.filter(r => r.id !== reportId));
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
            style={styles.refreshButton}
            onPress={loadInitial}
            activeOpacity={0.7}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <>
                <IconSymbol name="refresh" size={18} color={accentColor} />
                <Text style={[styles.refreshText, { color: accentColor, fontSize: getFontSizeValue(fontSize, 13) }]}>Actualizar</Text>
              </>
            )}
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
        onClose={() => setShowDetailModal(false)}
        report={selectedReport}
        onToggleLike={handleToggleLike}
        isLiked={false}
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
    borderRadius: 12,
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
