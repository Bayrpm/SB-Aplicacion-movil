// app/features/profileCitizen/components/cameraRequestModal.tsx
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface CameraRequestModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CameraRequestModal({
  visible,
  onClose,
}: CameraRequestModalProps) {
  const { fontSize } = useFontSize();
  const bgColor = useThemeColor({ light: '#FFFFFF', dark: '#071229' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'icon');
  const accentColor = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#374151' }, 'icon');
  const inputBg = useThemeColor({ light: '#F9FAFB', dark: '#000000' }, 'background');

  const [ubicacion, setUbicacion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [sending, setSending] = useState(false);

  const handleCancel = () => {
    setUbicacion('');
    setDescripcion('');
    setMotivo('');
    onClose();
  };

  const handleSend = async () => {
    // Validaciones
    if (!ubicacion.trim()) {
      AppAlert.alert('Error', 'La ubicación es requerida');
      return;
    }

    if (!motivo.trim()) {
      AppAlert.alert('Error', 'El motivo es requerido');
      return;
    }

    setSending(true);
    try {
      // TODO: Implementar envío de solicitud al backend
      // const response = await sendCameraRequest({ ubicacion, descripcion, motivo });
      
      // Simulación
      await new Promise(resolve => setTimeout(resolve, 1500));

      AppAlert.alert('Solicitud enviada', 'Tu solicitud de cámaras ha sido enviada al centro de control', [
        {
          text: 'OK',
          onPress: () => {
            setUbicacion('');
            setDescripcion('');
            setMotivo('');
            onClose();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error al enviar solicitud:', error);
      AppAlert.alert('Error', 'No se pudo enviar la solicitud');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor, fontSize: getFontSizeValue(fontSize, 20) }]}>
              Solicitar Cámaras
            </Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <IconSymbol name="close" size={24} color={mutedColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Ubicación */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                Ubicación <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                <IconSymbol name="location-pin" size={20} color={accentColor} />
                <TextInput
                  style={[styles.input, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                  value={ubicacion}
                  onChangeText={setUbicacion}
                  placeholder="Ej: Calle Principal con Av. 5"
                  placeholderTextColor={mutedColor}
                  editable={!sending}
                />
              </View>
            </View>

            {/* Descripción */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                Descripción del lugar
              </Text>
              <View style={[styles.textAreaContainer, { backgroundColor: inputBg, borderColor }]}>
                <TextInput
                  style={[styles.textArea, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                  value={descripcion}
                  onChangeText={setDescripcion}
                  placeholder="Ej: Cerca del supermercado, esquina norte"
                  placeholderTextColor={mutedColor}
                  multiline
                  numberOfLines={3}
                  editable={!sending}
                />
              </View>
            </View>

            {/* Motivo */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                Motivo de la solicitud <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={[styles.textAreaContainer, { backgroundColor: inputBg, borderColor }]}>
                <TextInput
                  style={[styles.textArea, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                  value={motivo}
                  onChangeText={setMotivo}
                  placeholder="Explica por qué necesitas acceso a las cámaras de esta zona"
                  placeholderTextColor={mutedColor}
                  multiline
                  numberOfLines={4}
                  editable={!sending}
                />
              </View>
              <Text style={[styles.helpText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>
                Este motivo será revisado por el centro de control
              </Text>
            </View>
          </ScrollView>

          {/* Botones de acción */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                {
                  borderColor: accentColor,
                  backgroundColor: 'transparent'
                }
              ]}
              onPress={handleCancel}
              disabled={sending}
            >
              <Text style={[styles.cancelButtonText, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.sendButton,
                { backgroundColor: accentColor },
                sending && styles.disabledButton,
              ]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.sendButtonText, { fontSize: getFontSizeValue(fontSize, 16) }]}>
                  Enviar solicitud
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  textAreaContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helpText: {
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontWeight: '500',
  },
  sendButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
