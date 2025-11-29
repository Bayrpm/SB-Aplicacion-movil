// app/features/profileInspector/components/myCasesComponent.tsx
import { IconSymbol } from '@/components/ui/icon-symbol';
import React from 'react';
import {
    GestureResponderEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export type CaseStatus = 'PENDIENTE' | 'EN_PROCESO' | 'CERRADA';

export interface MyCasesProps {
  title?: string;
  description?: string;
  timeAgo?: string;
  /** Fecha/hora exacta del evento (ISO string o Date). Si se pasa y `inspector=true`, se mostrará en formato dd/mm/yyyy y HH:MM */
  dateTime?: string | Date | null;
  address?: string;
  status?: CaseStatus;
  onPressDetail?: (event: GestureResponderEvent) => void;
  /** Si true, formatea la fecha/hora para la vista inspector */
  inspector?: boolean;
}

const STATUS_CONFIG: Record<
  CaseStatus,
  { label: string; bgColor: string; textColor: string }
> = {
  PENDIENTE: {
    label: 'Pendiente',
    bgColor: '#FFEFD5',
    textColor: '#C27A00',
  },
  EN_PROCESO: {
    label: 'En proceso',
    bgColor: '#FFF4CC',
    textColor: '#B58900',
  },
  CERRADA: {
    label: 'Cerrada',
    bgColor: '#E6F9EE',
    textColor: '#1C7C3C',
  },
};

export default function MyCases({
  title = 'Auto abandonado',
  description = 'Unos tipos dejaron un auto abandonado en avenida Américas esquina Colón',
  timeAgo = 'Hace 1 hora.',
  address = 'Av. Colón sur',
  status = 'PENDIENTE', // 👈 por defecto pendiente, las derivaciones reales vendrán con su estado
  onPressDetail,
  dateTime = null,
  inspector = false,
}: MyCasesProps) {
  const statusCfg = STATUS_CONFIG[status];

  const isInProgress = status === 'EN_PROCESO';

  return (
    <View style={[styles.card, isInProgress && styles.cardInProgress]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <IconSymbol
            name="alert-circle-outline"
            size={24}
            style={styles.carIcon}
            color={'#000'}
          />
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* Badge de estado */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusCfg.bgColor },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: statusCfg.textColor },
            ]}
          >
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* Descripción */}
      <Text style={styles.description}>{description}</Text>

      {/* Footer */}
      <View style={styles.footerRow}>
        {/* Izquierda: hora y dirección */}
        <View style={styles.footerLeft}>
          <View style={styles.footerItem}>
            <IconSymbol
              name="access-time"
              size={16}
              style={styles.footerIcon}
              color={'#000'}
            />
            {inspector ? (
              (() => {
                const pad = (n: number) => n.toString().padStart(2, '0');

                // Prefer explicit `dateTime` prop when provided
                const maybeDate = dateTime ? (typeof dateTime === 'string' ? new Date(dateTime) : (dateTime as Date)) : (() => {
                  // Try to parse `timeAgo` if it looks like a date/time (ISO or timestamp)
                  if (typeof timeAgo === 'string') {
                    // Heurística: si contiene dígitos y '-' o 'T' o ':' es probable que sea un datetime
                    if (/\d{4}-\d{2}-\d{2}|T|:\d{2}:/.test(timeAgo)) {
                      const parsed = new Date(timeAgo);
                      if (!isNaN(parsed.getTime())) return parsed;
                    }
                    // También permitir formatos con '/' (dd/mm/yyyy o mm/dd/yyyy) -- intentar parsear
                    const parsed2 = new Date(timeAgo);
                    if (!isNaN(parsed2.getTime())) return parsed2;
                  }
                  return null;
                })();

                if (maybeDate) {
                  const d = maybeDate as Date;
                  const dateString = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
                  const timeString = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
                  return (
                    <Text style={styles.footerText} numberOfLines={1}>
                      Fecha: {dateString}  Hora: {timeString}
                    </Text>
                  );
                }

                // Fallback: mostrar el texto original (ej. "Hace 1 hora")
                return (
                  <Text style={styles.footerText} numberOfLines={1}>
                    {timeAgo}
                  </Text>
                );
              })()
            ) : (
              <Text style={styles.footerText} numberOfLines={1}>
                {timeAgo}
              </Text>
            )}
          </View>
          <View style={styles.footerItem}>
            <IconSymbol
              name="place"
              size={16}
              style={styles.footerIcon}
              color={'#000'}
            />
            <Text style={styles.footerText} numberOfLines={1} ellipsizeMode="tail">
              {address}
            </Text>
          </View>
        </View>

        {/* Derecha: botón */}
        <View style={styles.footerRight}>
          <TouchableOpacity
            style={styles.detailButton}
            onPress={onPressDetail}
            activeOpacity={0.7}
          >
            <Text style={styles.detailButtonText}>Ver detalle</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
  },
  cardInProgress: {
    borderWidth: 1,
    borderColor: '#FFD86B',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    paddingRight: 8,
  },
  carIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#555',
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  footerLeft: {
    flex: 1,
    minWidth: 0,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    minWidth: 0,
  },
  footerIcon: {
    marginRight: 4,
    flexShrink: 0,
  },
  footerText: {
    fontSize: 11,
    color: '#777',
    flex: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  detailButton: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  detailButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
});
