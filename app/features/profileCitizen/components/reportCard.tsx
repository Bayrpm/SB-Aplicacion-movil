// app/features/homeCitizen/components/ReportCard.tsx
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CitizenReport } from '../api/profile.api';
import { getRelativeTime } from '../utils/timeFormat';

interface ReportCardProps {
  report: CitizenReport;
  onPress: () => void;
}

/** Mapea categorías a SF Symbols (usa nombres simples en minúscula) */
function getCategoryIcon(categoryId?: number | null): string {
  // Mapeo por ID de categoría (igual que en reportPickerModal)
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

  if (categoryId && ICON_MAP[categoryId]) {
    return ICON_MAP[categoryId];
  }

  // Fallback: si no hay categoría o no está en el mapa, usar 'map-marker'
  return 'map-marker';
}

export default function ReportCard({ report, onPress }: ReportCardProps) {
  const { fontSize } = useFontSize();
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#071229' }, 'background'); // Color específico para modo oscuro
  const textColor = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'icon');   // texto secundario
  const accentButtonBg = useThemeColor({ light: 'transparent', dark: '#0A4A90' }, 'tint'); // Azul en oscuro
  const accentButtonBorder = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint'); // Borde azul siempre
  const accentButtonText = useThemeColor({ light: '#0A4A90', dark: '#FFFFFF' }, 'tint'); // Blanco en oscuro

  // Usar categoria_publica_id directamente en lugar de categoria.id
  const categoryIcon = getCategoryIcon(report.categoria_publica_id);
  const relativeTime = getRelativeTime(report.fecha_creacion);
  const description = report.descripcion || '';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: muted + '26', // ~15% alpha
          ...(Platform.OS === 'android'
            ? { elevation: 3 }
            : {
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
              }),
        },
      ]}
    >
      {/* Icono a la izquierda (sin círculo de fondo) */}
      <View style={styles.leftIcon}>
        <IconSymbol name={categoryIcon} size={28} color={textColor} />
      </View>

      {/* Cuerpo de la card */}
      <View style={styles.body}>
        <Text style={[styles.title, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]} numberOfLines={1}>
          {report.titulo}
        </Text>

        {!!description && (
          <Text style={[styles.description, { color: muted, fontSize: getFontSizeValue(fontSize, 13.5) }]} numberOfLines={2}>
            {description}
          </Text>
        )}

        {/* Metadatos: hora + ubicación */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <IconSymbol name="clock" size={14} color={muted} />
            <Text style={[styles.metaText, { color: muted, fontSize: getFontSizeValue(fontSize, 12) }]} numberOfLines={1}>
              {relativeTime}
            </Text>
          </View>

          {!!report.ubicacion_texto && (
            <View style={styles.metaItem}>
              <IconSymbol name="location-pin" size={14} color={muted} />
              <Text style={[styles.metaText, { color: muted, fontSize: getFontSizeValue(fontSize, 12) }]} numberOfLines={1}>
                {report.ubicacion_texto}
              </Text>
            </View>
          )}
        </View>

        {/* Botón Ver detalle - ahora en su propia fila */}
        <TouchableOpacity
          style={[
            styles.detailButton,
            {
              backgroundColor: accentButtonBg,
              borderColor: accentButtonBorder,
            },
          ]}
          onPress={() => {
            try { console.warn('ReportCard: pressed ->', report.id); } catch {}
            try { onPress(); } catch (e) { try { console.warn('ReportCard: onPress error', e); } catch {} }
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.detailButtonText, { color: accentButtonText, fontSize: getFontSizeValue(fontSize, 13) }]}>Ver detalle</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  leftIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  body: {
    flex: 1,
    gap: 6,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  description: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '48%',
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  detailButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
