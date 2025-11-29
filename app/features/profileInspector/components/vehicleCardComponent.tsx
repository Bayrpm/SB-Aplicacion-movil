// app/features/profileInspector/components/vehicleCardComponent.tsx
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Movil } from '../api/dataMovil.api';

interface VehicleCardProps {
  movil: Movil;
  km_inicio: number;
}

export function VehicleCard({ movil, km_inicio }: VehicleCardProps) {
  const movilTipo =
    typeof movil.movil_tipo === 'object' && movil.movil_tipo !== null && !Array.isArray(movil.movil_tipo)
      ? movil.movil_tipo.nombre
      : Array.isArray(movil.movil_tipo) && movil.movil_tipo.length > 0
      ? movil.movil_tipo[0].nombre
      : 'N/A';

  const vehiculoNombre =
    movil.marca && movil.modelo
      ? `${movil.marca} ${movil.modelo} ${movil.anio ?? ''}`.trim()
      : 'No especificado';

  return (
    (() => {
      const { fontSize } = useFontSize();
      const bgColor = useThemeColor({ light: '#ffffff', dark: '#071229' }, 'background');
      const textColor = useThemeColor({}, 'text');
      const mutedColor = useThemeColor({ light: '#6b7280', dark: '#9CA3AF' }, 'icon');
      const accent = useThemeColor({ light: '#059669', dark: '#059669' }, 'tint');

      const getFontSizeValue = (size: 'small' | 'medium' | 'large', base: number) => {
        switch (size) {
          case 'small':
            return base * 0.85;
          case 'medium':
            return base;
          case 'large':
            return base * 1.25;
          default:
            return base;
        }
      };

      return (
        <View style={[styles.card, { backgroundColor: bgColor }] }>
          <View style={styles.header}>
            <IconSymbol name="car" size={28} color={accent} />
            <Text style={[styles.title, { color: textColor, fontSize: getFontSizeValue(fontSize, 18) }]}>Móvil en uso</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 14) }]}>Patente:</Text>
              <Text style={[styles.value, { color: textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>{movil.patente}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 14) }]}>Tipo:</Text>
              <Text style={[styles.value, { color: textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>{movilTipo}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 14) }]}>Vehículo:</Text>
              <Text style={[styles.value, { color: textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>{vehiculoNombre}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 14) }]}>Km inicial:</Text>
              <Text style={[styles.value, { color: textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>{km_inicio.toLocaleString()} km</Text>
            </View>
          </View>
        </View>
      );
    })()
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    gap: 10,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
});

export default VehicleCard;