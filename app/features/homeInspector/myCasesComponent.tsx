import { IconSymbol } from '@/components/ui/icon-symbol';
import React from 'react';
import {
    GestureResponderEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export interface MyCasesProps {
  title?: string;
  description?: string;
  timeAgo?: string;
  address?: string;
  onPressDetail?: (event: GestureResponderEvent) => void;
}

export default function myCases({
  title = 'Auto abandonado',
  description = 'Unos tipos dejaron un auto abandonado en avenida Américas esquina Colón',
  timeAgo = 'Hace 1 hora.',
  address = 'Av. Colón sur',
  onPressDetail,
}: MyCasesProps){
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <IconSymbol name="alert-circle-outline" size={24} style={styles.carIcon} color={'#000'} />
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Descripción */}
      <Text style={styles.description}>{description}</Text>

      {/* Footer */}
      <View style={styles.footerRow}>
        {/* Izquierda: hora y dirección */}
        <View>
          <View style={styles.footerItem}>
            <IconSymbol name="access-time" size={16} style={styles.footerIcon} color={'#000'} />
            <Text style={styles.footerText}>{timeAgo}</Text>
          </View>
          <View style={styles.footerItem}>
            <IconSymbol name="place" size={16} style={styles.footerIcon}  color={'#000'}/>
            <Text style={styles.footerText}>{address}</Text>
          </View>
        </View>

        {/* Derecha: botón y check */}
        <View style={styles.footerRight}>
          <TouchableOpacity
            style={styles.detailButton}
            onPress={onPressDetail}
            activeOpacity={0.7}
          >
            <Text style={styles.detailButtonText}>Ver detalle</Text>
          </TouchableOpacity>

          <View style={styles.okCircle}>
            <IconSymbol name="check" size={20} style={styles.okIcon} color={'#000'}/>
          </View>
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
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  carIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
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
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  footerIcon: {
    marginRight: 4,
  },
  footerText: {
    fontSize: 11,
    color: '#777',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailButton: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  detailButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  okCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#24C568',
    alignItems: 'center',
    justifyContent: 'center',
  },
  okIcon: {
    color: '#fff',
  },
});
