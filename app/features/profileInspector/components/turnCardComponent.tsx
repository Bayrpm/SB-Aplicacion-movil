// app/features/profileInspector/components/turnCardComponent.tsx
import { IconSymbol } from '@/components/ui/icon-symbol';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TurnCardProps {
  shiftTitle?: string;
  schedule?: string;
  statusText?: string;
  timeAgo?: string;
  place?: string;
  onPressDetail?: () => void;
  onCloseShift?: () => void;
}

const TurnCard: React.FC<TurnCardProps> = ({
  shiftTitle = 'Turno mañana',
  schedule = '06:00 am - 13:00 pm',
  statusText = 'Estado: Activo.',
  timeAgo = 'Hace 2 horas.',
  place = 'Trebol',
  onPressDetail,
  onCloseShift,
}) => {
  return (
    <View style={styles.container}>
      {/* Título Turno + check */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Turno</Text>
        <View style={styles.headerCheck}>
          <IconSymbol name="check" size={20} color="#FFFFFF" />
        </View>
      </View>

      {/* Card principal */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <IconSymbol name="person" size={32} color="#FFFFFF" />
          </View>

          <View style={styles.info}>
            <Text style={styles.shiftTitle}>{shiftTitle}</Text>
            <Text style={styles.schedule}>{schedule}</Text>
            <Text style={styles.status}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View>
            <View style={styles.bottomItem}>
              <IconSymbol name="access-time" size={14} color="#7A7A7A" />
              <Text style={styles.bottomText}>{timeAgo}</Text>
            </View>
            <View style={styles.bottomItem}>
              <IconSymbol name="vpn-key" size={14} color="#7A7A7A" />
              <Text style={styles.bottomText}>{place}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.detailButton}
            activeOpacity={0.7}
            onPress={onPressDetail}
          >
            <Text style={styles.detailButtonText}>Ver detalle</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.closeButton}
        activeOpacity={0.8}
        onPress={onCloseShift}
      >
        <Text style={styles.closeButtonText}>Cerrar turno</Text>
      </TouchableOpacity>
    </View>
  );
};

export default TurnCard;
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,

  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginRight: 8,
    padding: 10,
    alignContent: 'center',
  },
  headerCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#24C568',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  schedule: {
    fontSize: 13,
    color: '#555555',
    marginBottom: 2,
  },
  status: {
    fontSize: 13,
    color: '#333333',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  bottomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bottomText: {
    fontSize: 11,
    color: '#7A7A7A',
    marginLeft: 4,
  },
  detailButton: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  detailButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeButton: {
    marginTop: 24,
    width: '70%',
    borderRadius: 24,
    paddingVertical: 12,
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
