// app/features/homeCitizen/components/ReportsList.tsx
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as Network from 'expo-network';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CitizenReport, getAllCategories, getAllEstados, getCitizenReports } from '../api/profile.api';
import FilterModal, { FilterOptions } from './filterModal';
import ReportCard from './reportCard';
import ReportDetailModal from './reportDetailModal';

export default function ReportsList() {
  const { fontSize } = useFontSize();
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [networkError, setNetworkError] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    orderBy: 'fecha_desc',
    categoryId: null,
    estadoId: null,
  });
  const [categories, setCategories] = useState<{ id: number; nombre: string }[]>([]);
  const [estados, setEstados] = useState<{ id: number; nombre: string }[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CitizenReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint'); // Azul siempre
  const iconColor = useThemeColor({}, 'icon');
  const buttonBg = useThemeColor({ light: 'transparent', dark: '#0A4A90' }, 'tint'); // Azul en oscuro
  const buttonText = useThemeColor({ light: '#0A4A90', dark: '#FFFFFF' }, 'tint'); // Blanco en oscuro

  const LIMIT = 3;

  // Cargar categorías y estados al inicio
  useEffect(() => {
    const loadFiltersData = async () => {
      const [categoriesRes, estadosRes] = await Promise.all([
        getAllCategories(),
        getAllEstados(),
      ]);

      if (categoriesRes.data) {
        setCategories(categoriesRes.data);
      }
      if (estadosRes.data) {
        setEstados(estadosRes.data);
      }
    };

    loadFiltersData();
  }, []);

  const loadInitialReports = useCallback(async () => {
    setLoading(true);
    setNetworkError(false);
    // Verificar conectividad antes de llamar a la API
    try {
      const st = await Network.getNetworkStateAsync();
      const connected = !!st.isConnected && st.isInternetReachable !== false;
      if (!connected) {
        setNetworkError(true);
        setLoading(false);
        return;
      }
    } catch {
      setNetworkError(true);
      setLoading(false);
      return;
    }
    const { data, error, hasMore: more } = await getCitizenReports(
      LIMIT,
      0,
      filters.orderBy,
      filters.categoryId,
      filters.estadoId
    );
    if (error) {
      setNetworkError(true);
      setLoading(false);
      return;
    }
    setReports(data || []);
    setHasMore(!!more);
    setOffset(LIMIT);
    setNetworkError(false);
    setLoading(false);
  }, [filters]);

  const loadMoreReports = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    // Verificar conectividad antes de paginar
    try {
      const st = await Network.getNetworkStateAsync();
      const connected = !!st.isConnected && st.isInternetReachable !== false;
      if (!connected) {
        setNetworkError(true);
        setLoadingMore(false);
        return;
      }
    } catch {
      setNetworkError(true);
      setLoadingMore(false);
      return;
    }
    const { data, error, hasMore: more } = await getCitizenReports(
      LIMIT,
      offset,
      filters.orderBy,
      filters.categoryId,
      filters.estadoId
    );
    if (error) {
      setLoadingMore(false);
      return;
    }
    setReports(prev => {
      const existing = new Set(prev.map(r => String(r.id)));
      const next = (data || []).filter(r => !existing.has(String(r.id)));
      return [...prev, ...next];
    });
    setHasMore(!!more);
    setOffset(prev => prev + LIMIT);
    setLoadingMore(false);
    
    // Si ya no hay más, marcar que se mostró todo
    if (!more) {
      setShowAll(true);
    }
  }, [loadingMore, hasMore, offset, filters]);

  const handleShowLess = useCallback(() => {
    // Resetear a solo los primeros LIMIT elementos
    setReports(prev => prev.slice(0, LIMIT));
    setOffset(LIMIT);
    setHasMore(true);
    setShowAll(false);
  }, []);

  const handleReportPress = useCallback((report: CitizenReport) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  }, []);

  const handleFilterPress = useCallback(() => {
    setShowFilterModal(true);
  }, []);

  const handleApplyFilters = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    // Al aplicar filtros, reiniciar la lista
    setOffset(0);
    setShowAll(false);
  }, []);

  const handleToggleLike = useCallback(() => {
    // TODO: Implementar funcionalidad de like
    console.log('Toggle like para reporte:', selectedReport?.id);
  }, [selectedReport]);

  useEffect(() => {
    loadInitialReports();
  }, [loadInitialReports]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={accentColor} />
  <Text style={[styles.loadingText, { color: iconColor, fontSize: getFontSizeValue(fontSize, 14) }]}>Cargando denuncias...</Text>
      </View>
    );
  }

  // Mostrar error de red
  if (networkError && reports.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <IconSymbol name="wifi-off" size={48} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 18) }]}>
          Sin conexión a la red
        </Text>
        <Text style={[styles.errorSubtitle, { color: iconColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
          No se pudieron cargar tus denuncias
        </Text>
        <TouchableOpacity
          style={[
            styles.retryButton,
            { backgroundColor: accentColor }
          ]}
          onPress={loadInitialReports}
          activeOpacity={0.7}
        >
          <IconSymbol name="refresh" size={20} color="#FFFFFF" />
          <Text style={[styles.retryButtonText, { fontSize: getFontSizeValue(fontSize, 15) }]}>
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
      {/* Título de sección con botón de filtro */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 22) }]}>
          Mis Denuncias
        </Text>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            { 
              backgroundColor: buttonBg,
              borderColor: accentColor 
            }
          ]}
          onPress={handleFilterPress}
          activeOpacity={0.7}
        >
          <IconSymbol name="filter-list" size={18} color={buttonText} />
          <Text style={[styles.filterText, { color: buttonText, fontSize: getFontSizeValue(fontSize, 14) }]}>Filtrar</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de denuncias */}
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          onPress={() => handleReportPress(report)}
        />
      ))}

      {/* Estado vacío */}
      {reports.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 18) }]}>
            No tienes denuncias registradas
          </Text>
          <Text style={[styles.emptySubtitle, { color: iconColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
            Tus reportes aparecerán aquí
          </Text>
        </View>
      )}

      {/* Botón Ver más */}
      {hasMore && !showAll && (
        <TouchableOpacity
          style={[
            styles.loadMoreButton, 
            { 
              backgroundColor: buttonBg,
              borderColor: accentColor 
            }
          ]}
          onPress={loadMoreReports}
          disabled={loadingMore}
          activeOpacity={0.7}
        >
          {loadingMore ? (
            <ActivityIndicator size="small" color={buttonText} />
          ) : (
            <Text style={[styles.loadMoreText, { color: buttonText, fontSize: getFontSizeValue(fontSize, 15) }]}>
              Ver más
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Botón Ver menos */}
      {showAll && reports.length > LIMIT && (
        <TouchableOpacity
          style={[
            styles.loadMoreButton, 
            { 
              backgroundColor: buttonBg,
              borderColor: accentColor 
            }
          ]}
          onPress={handleShowLess}
          activeOpacity={0.7}
        >
          <Text style={[styles.loadMoreText, { color: buttonText, fontSize: getFontSizeValue(fontSize, 15) }]}>
            Ver menos
          </Text>
        </TouchableOpacity>
      )}
      </View>

      {/* Modales */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        currentFilters={filters}
        onApplyFilters={handleApplyFilters}
        categories={categories}
        estados={estados}
      />

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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
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
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadMoreButton: {
    marginTop: 8,
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
