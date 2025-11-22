// app/features/profileInspector/components/vehicleCardComponent.tsx
import { IconSymbol } from '@/components/ui/icon-symbol';
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
    <View style={styles.card}>
      <View style={styles.header}>
        <IconSymbol name="car" size={28} color="#059669" />
        <Text style={styles.title}>Móvil en uso</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Patente:</Text>
          <Text style={styles.value}>{movil.patente}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Tipo:</Text>
          <Text style={styles.value}>{movilTipo}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Vehículo:</Text>
          <Text style={styles.value}>{vehiculoNombre}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Km inicial:</Text>
          <Text style={styles.value}>{km_inicio.toLocaleString()} km</Text>
        </View>
      </View>
    </View>
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
