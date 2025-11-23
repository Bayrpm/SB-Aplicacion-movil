// app/features/profileInspector/components/DerivationDetailModal.tsx
import {
    DerivacionItem,
    cerrarDerivacionConReporte,
} from '@/app/features/homeInspector/api/inspectorDerivations.api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface DerivationDetailModalProps {
  visible: boolean;
  derivacion: DerivacionItem | null;
  onClose: () => void;
  /**
   * Callback opcional para avisar al padre que el cierre fue exitoso.
   * Ideal para recargar la lista en inspectorHome.tsx
   */
  onClosedSuccessfully?: () => void;
}

export default function DerivationDetailModal({
  visible,
  derivacion,
  onClose,
  onClosedSuccessfully,
}: DerivationDetailModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isClosingMode, setIsClosingMode] = useState(false);
  const [reporte, setReporte] = useState('');

  if (!derivacion) {
    return null;
  }

  const handleStartClosing = () => {
    setIsClosingMode(true);
  };

  const handleCancelClosing = () => {
    setIsClosingMode(false);
    setReporte('');
  };

  const handleConfirmClose = async () => {
    if (!reporte.trim()) {
      Alert.alert(
        'Reporte requerido',
        'Debes escribir un reporte para cerrar el caso.'
      );
      return;
    }

    try {
      setIsClosing(true);

      const result = await cerrarDerivacionConReporte({
        asignacionId: derivacion.asignacionId,
        denunciaId: derivacion.denunciaId,
        reporte: reporte.trim(),
      });

      if (!result.ok) {
        console.log('[derivacion][cerrar][error]', result);
        Alert.alert(
          'Error al cerrar',
          result.message || 'Ocurrió un error al cerrar la derivación.'
        );
        return;
      }

      // Éxito
      setIsClosingMode(false);
      setReporte('');
      onClose();
      onClosedSuccessfully?.();
    } finally {
      setIsClosing(false);
    }
  };

  // Usamos el estado de la denuncia (estadoNombre)
  const estadoNombre = derivacion.estadoNombre;
  const estadoLabel =
    estadoNombre === 'PENDIENTE'
      ? 'Pendiente'
      : estadoNombre === 'EN_PROCESO'
      ? 'En proceso'
      : estadoNombre === 'CERRADA'
      ? 'Cerrada'
      : 'Desconocido';

  const fechaDerivacion = new Date(
    derivacion.fechaDerivacion
  ).toLocaleString('es-CL');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        if (!isClosing) {
          onClose();
        }
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <IconSymbol
                name="assignment"
                size={22}
                style={styles.headerIcon}
                color="#000"
              />
              <Text style={styles.headerTitle}>
                {derivacion.titulo || 'Detalle de denuncia'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              disabled={isClosing}
              style={styles.closeButton}
            >
              <IconSymbol name="close" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Folio y estado */}
            <View style={styles.row}>
              <Text style={styles.label}>Folio</Text>
              <Text style={styles.value}>
                {derivacion.folio || 'Sin folio'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Estado derivación</Text>
              <Text style={styles.value}>{estadoLabel}</Text>
            </View>

            {/* Si quieres, podrías mostrar también el estado bruto de la denuncia */}
            {/* 
            <View style={styles.row}>
              <Text style={styles.label}>Estado denuncia (BD)</Text>
              <Text style={styles.value}>{derivacion.estadoNombre}</Text>
            </View>
            */}

            <View style={styles.row}>
              <Text style={styles.label}>Derivada el</Text>
              <Text style={styles.value}>{fechaDerivacion}</Text>
            </View>

            {/* Fechas de atención */}
            {derivacion.fechaInicioAtencion && (
              <View style={styles.row}>
                <Text style={styles.label}>Inicio atención</Text>
                <Text style={styles.value}>
                  {new Date(
                    derivacion.fechaInicioAtencion
                  ).toLocaleString('es-CL')}
                </Text>
              </View>
            )}

            {derivacion.fechaTermino && (
              <View style={styles.row}>
                <Text style={styles.label}>Término atención</Text>
                <Text style={styles.value}>
                  {new Date(
                    derivacion.fechaTermino
                  ).toLocaleString('es-CL')}
                </Text>
              </View>
            )}

            {derivacion.descripcion && (
              <View style={styles.row}>
                <Text style={styles.label}>Descripción</Text>
                <Text style={styles.value}>{derivacion.descripcion}</Text>
              </View>
            )}

            {derivacion.ubicacionTexto && (
              <View style={styles.row}>
                <Text style={styles.label}>Dirección</Text>
                <Text style={styles.value}>{derivacion.ubicacionTexto}</Text>
              </View>
            )}
          </ScrollView>

          {/* Zona de cierre: solo si la derivación NO está cerrada según estadoNombre */}
          {!isClosingMode && estadoNombre !== 'CERRADA' && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.finalizarButton}
                onPress={handleStartClosing}
                disabled={isClosing}
              >
                <Text style={styles.finalizarButtonText}>Finalizar caso</Text>
              </TouchableOpacity>
            </View>
          )}

          {isClosingMode && (
            <View style={styles.footerClosing}>
              <Text style={styles.reporteLabel}>Reporte final</Text>
              <TextInput
                style={styles.reporteInput}
                placeholder="Describe brevemente qué hiciste y el resultado..."
                value={reporte}
                onChangeText={setReporte}
                editable={!isClosing}
                multiline
              />

              <View style={styles.footerButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelClosing}
                  disabled={isClosing}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirmClose}
                  disabled={isClosing}
                >
                  {isClosing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmButtonText}>
                      Aceptar y cerrar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    paddingHorizontal: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  row: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: '#222',
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  finalizarButton: {
    backgroundColor: '#1C7C3C',
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  finalizarButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footerClosing: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  reporteLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#444',
    marginBottom: 4,
  },
  reporteInput: {
    minHeight: 80,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  footerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8 as any, // si tu versión de RN no soporta gap, elimina esta línea
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#888',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 13,
    color: '#444',
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#1C7C3C',
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
