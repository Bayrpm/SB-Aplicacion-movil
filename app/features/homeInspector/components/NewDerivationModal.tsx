// app/features/profileInspector/components/NewDerivationModal.tsx
import { DerivacionItem } from '@/app/features/homeInspector/api/inspectorDerivations.api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface NewDerivationModalProps {
  visible: boolean;
  derivacion: DerivacionItem | null;
  onView: () => void;    // Ver → ir al detalle
  onDismiss: () => void; // Cerrar modal sin ir al detalle
}

export default function NewDerivationModal({
  visible,
  derivacion,
  onView,
  onDismiss,
}: NewDerivationModalProps) {
  // Log para debugging
  React.useEffect(() => {
    console.log('[NewDerivationModal] 🎭 Render - visible:', visible, 'derivacion:', derivacion?.folio);
  }, [visible, derivacion]);

  if (!derivacion) {
    console.log('[NewDerivationModal] ❌ No hay derivación - no renderizar');
    return null;
  }

  console.log('[NewDerivationModal] ✅ Renderizando modal con visible:', visible);

  const titulo = derivacion.titulo || 'Nueva derivación asignada';
  const folio = derivacion.folio || 'Sin folio';
  const fechaDerivacion = new Date(
    derivacion.fechaDerivacion
  ).toLocaleString('es-CL');

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <IconSymbol
              name="notifications-active"
              size={32}
              color="#fff"
            />
          </View>

          <Text style={styles.title}>Derivación asignada</Text>

          <Text style={styles.subtitle}>
            Se te ha asignado una nueva denuncia.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Folio</Text>
            <Text style={styles.value}>{folio}</Text>

            <Text style={[styles.label, { marginTop: 8 }]}>Título</Text>
            <Text style={styles.value}>{titulo}</Text>

            <Text style={[styles.label, { marginTop: 8 }]}>
              Derivada el
            </Text>
            <Text style={styles.value}>{fechaDerivacion}</Text>
          </View>

          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onDismiss}
            >
              <Text style={styles.secondaryButtonText}>Cerrar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onView}
            >
              <Text style={styles.primaryButtonText}>Ver ahora</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    marginBottom: 12,
  },
  infoBox: {
    alignSelf: 'stretch',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },
  value: {
    fontSize: 13,
    color: '#222',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
    marginTop: 4,
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#999',
    marginRight: 8,
  },
  secondaryButtonText: {
    fontSize: 13,
    color: '#444',
  },
  primaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
