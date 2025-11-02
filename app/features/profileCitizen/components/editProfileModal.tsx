// app/features/profileCitizen/components/editProfileModal.tsx
import { updateCitizenProfile, type CitizenProfile } from '@/app/features/profileCitizen/api/profile.api';
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

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  profile: CitizenProfile | null;
  onProfileUpdated: (updatedProfile: CitizenProfile) => void;
}

export default function EditProfileModal({
  visible,
  onClose,
  profile,
  onProfileUpdated,
}: EditProfileModalProps) {
  const { fontSize } = useFontSize();
  const bgColor = useThemeColor({ light: '#FFFFFF', dark: '#071229' }, 'background'); // Color específico para modo oscuro
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'icon');
  const accentColor = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint'); // Azul siempre
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#374151' }, 'icon');
  const inputBg = useThemeColor({ light: '#F9FAFB', dark: '#000000' }, 'background'); // Negro en modo oscuro
  const saveButtonBg = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint'); // Azul siempre
  const saveButtonText = '#FFFFFF'; // Blanco siempre

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Actualizar los estados cuando cambie el perfil o cuando el modal se hace visible
  React.useEffect(() => {
    if (visible && profile) {
      setNombre(profile.nombre || '');
      setApellido(profile.apellido || '');
      setTelefono(profile.telefono || '');
      setEmail(profile.email || '');
    }
  }, [profile, visible]);

  const handleSave = async () => {
    // Validaciones básicas
    if (!nombre.trim()) {
      AppAlert.alert('Error', 'El nombre es requerido');
      return;
    }

    if (!apellido.trim()) {
      AppAlert.alert('Error', 'El apellido es requerido');
      return;
    }

    if (!email.trim()) {
      AppAlert.alert('Error', 'El correo es requerido');
      return;
    }

    // Validar formato de email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      AppAlert.alert('Error', 'El correo electrónico no es válido');
      return;
    }

    // Validar formato chileno: +56 9 XXXX XXXX o solo 9 XXXXXXXX (9 dígitos)
    const phonePattern = /^(\+?56)?9\d{8}$/;
    if (telefono.trim() && !phonePattern.test(telefono.trim().replace(/\s/g, ''))) {
      AppAlert.alert('Error', 'El teléfono debe ser un número válido (Ej: +56912345678 o 912345678)');
      return;
    }

    setSaving(true);
    try {
      const updates = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        ...(telefono.trim() && { telefono: telefono.trim() }),
      };

      const { data, error } = await updateCitizenProfile(updates);

      if (error || !data) {
        AppAlert.alert('Error', error || 'No se pudo actualizar el perfil');
        return;
      }

      // Mostrar mensaje de confirmación
      AppAlert.alert('Éxito', 'Tu perfil ha sido actualizado correctamente', [
        {
          text: 'OK',
          onPress: () => {
            onProfileUpdated(data);
            onClose();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error al actualizar perfil:', error);
      AppAlert.alert('Error', 'Error inesperado al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Restaurar valores originales
    setNombre(profile?.nombre || '');
    setApellido(profile?.apellido || '');
    setTelefono(profile?.telefono || '');
    setEmail(profile?.email || '');
    onClose();
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
            <Text style={[styles.title, { color: textColor, fontSize: getFontSizeValue(fontSize, 20) }]}>Editar Perfil</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <IconSymbol name="close" size={24} color={mutedColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Email (ahora editable) */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}> 
                Correo Electrónico <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                <IconSymbol name="email" size={20} color={accentColor} />
                <TextInput
                  style={[styles.input, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor={mutedColor}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!saving}
                />
              </View>
              <Text style={[styles.helpText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}> 
                Se enviará un correo de confirmación si lo cambias
              </Text>
            </View>

            {/* Nombre */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}> 
                Nombre <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                <IconSymbol name="account" size={20} color={accentColor} />
                <TextInput
                  style={[styles.input, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Ingresa tu nombre"
                  placeholderTextColor={mutedColor}
                  editable={!saving}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Apellido */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}> 
                Apellido <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                <IconSymbol name="account" size={20} color={accentColor} />
                <TextInput
                  style={[styles.input, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                  value={apellido}
                  onChangeText={setApellido}
                  placeholder="Ingresa tu apellido"
                  placeholderTextColor={mutedColor}
                  editable={!saving}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Teléfono */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>Teléfono</Text>
              <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                <IconSymbol name="phone" size={20} color={accentColor} />
                <TextInput
                  style={[styles.input, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                  value={telefono}
                  onChangeText={setTelefono}
                  placeholder="+56912345678"
                  placeholderTextColor={mutedColor}
                  keyboardType="phone-pad"
                  editable={!saving}
                />
              </View>
              <Text style={[styles.helpText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}> 
                Formato: +56912345678 o 912345678
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
              disabled={saving}
            >
              <Text style={[styles.cancelButtonText, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}> 
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                { backgroundColor: saveButtonBg },
                saving && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={saveButtonText} />
              ) : (
                <Text style={[styles.saveButtonText, { color: saveButtonText, fontSize: getFontSizeValue(fontSize, 16) }]}>Guardar</Text>
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
    fontSize: 20,
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
    fontSize: 14,
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
    fontSize: 16,
    paddingVertical: 0,
  },
  helpText: {
    fontSize: 12,
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
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
