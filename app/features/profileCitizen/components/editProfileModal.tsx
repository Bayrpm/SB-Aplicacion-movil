// app/features/profileCitizen/components/editProfileModal.tsx
import { updateCitizenProfile, type CitizenProfile } from '@/app/features/profileCitizen/api/profile.api';
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
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
  const scrollRef = useRef<ScrollView | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const fieldYRef = useRef<Record<string, number>>({});
  const activeFieldKeyRef = useRef<string | null>(null);

  const rememberFieldY = (key: string) => (e: any) => {
    try { fieldYRef.current[key] = e?.nativeEvent?.layout?.y ?? 0; } catch {}
  };

  const scrollToField = (key: string) => {
    const y = fieldYRef.current[key] ?? 0;
    const targetY = Math.max(0, y - 100);
    // Primer intento inmediato
    requestAnimationFrame(() => {
      try { scrollRef.current?.scrollTo({ y: targetY, animated: true }); } catch {}
    });
    // Segundo intento tras mostrar el teclado/animaciones
    setTimeout(() => {
      try { scrollRef.current?.scrollTo({ y: targetY, animated: true }); } catch {}
    }, 160);
  };

  useEffect(() => {
    const onDidShow = (e: any) => {
      try { setKeyboardHeight(e?.endCoordinates?.height ?? 0); } catch { setKeyboardHeight(300); }
      const k = activeFieldKeyRef.current;
      if (k) scrollToField(k);
    };
    const onWillShow = (e: any) => {
      if (Platform.OS === 'ios') {
        const k = activeFieldKeyRef.current;
        if (k) setTimeout(() => scrollToField(k), 60);
      }
    };
    const onHide = () => setKeyboardHeight(0);

    const sub1 = Keyboard.addListener('keyboardDidShow', onDidShow);
    const sub2 = Keyboard.addListener('keyboardDidHide', onHide);
    const sub3 = Platform.OS === 'ios' ? Keyboard.addListener('keyboardWillShow', onWillShow) : { remove: () => {} } as any;
    return () => {
      try { sub1.remove(); } catch {}
      try { sub2.remove(); } catch {}
      try { sub3.remove(); } catch {}
    };
  }, []);

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

    // Correo no editable desde aquí, no validar formato ni requerirlo (se asume proviene del perfil)

    // Validar formato chileno si hay números ingresados (se normaliza eliminando espacios)
    const digitsOnly = telefono.replace(/\D/g, '');
    const phonePattern = /^(?:56)?9\d{8}$/; // acepta 569XXXXXXXX o 9XXXXXXXX
    if (digitsOnly && !phonePattern.test(digitsOnly)) {
      AppAlert.alert('Error', 'El teléfono debe ser un número válido (+56 9 y 8 dígitos)');
      return;
    }

    setSaving(true);
    try {
      // Normalizar teléfono a formato +569XXXXXXXX para guardar si existe
      const normalizedPhone = (() => {
        const d = telefono.replace(/\D/g, '');
        const m = d.match(/(?:56)?9(\d{8})$/);
        return m ? `+569${m[1]}` : null;
      })();

      const updates = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        ...(normalizedPhone && { telefono: normalizedPhone }),
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
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor, fontSize: getFontSizeValue(fontSize, 20) }]}>Editar Perfil</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <IconSymbol name="close" size={24} color={mutedColor} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView
            behavior={Platform.select({ ios: 'padding', android: 'height' })}
            keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              contentInsetAdjustmentBehavior="always"
              ref={scrollRef}
              contentContainerStyle={{ paddingBottom: 24 + Math.max(0, keyboardHeight - 12) }}
              onContentSizeChange={() => {
                const k = activeFieldKeyRef.current; if (k) setTimeout(() => scrollToField(k), 60);
              }}
            >
              {/* Email (solo lectura) */}
              <View style={styles.fieldContainer} onLayout={rememberFieldY('email')}>
                <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}> 
                  Correo Electrónico <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <View pointerEvents="none" style={[styles.inputContainer, { backgroundColor: inputBg, borderColor, opacity: 0.6 }]} accessibilityRole="text" accessibilityState={{ disabled: true }}>
                  <IconSymbol name="email" size={20} color={mutedColor} style={{ opacity: 0.65 }} />
                  <Text
                    style={[styles.input, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 16), opacity: 0.75 }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {email || 'correo@ejemplo.com'}
                  </Text>
                </View>
                <Text style={[styles.helpText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}> 
                  Tu correo no se puede cambiar desde aquí
                </Text>
              </View>

              {/* Nombre */}
              <View style={styles.fieldContainer} onLayout={rememberFieldY('nombre')}>
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
                    onFocus={() => { activeFieldKeyRef.current = 'nombre'; scrollToField('nombre'); }}
                    onSelectionChange={() => { activeFieldKeyRef.current = 'nombre'; setTimeout(() => scrollToField('nombre'), 40); }}
                  />
                </View>
              </View>

              {/* Apellido */}
              <View style={styles.fieldContainer} onLayout={rememberFieldY('apellido')}>
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
                    onFocus={() => { activeFieldKeyRef.current = 'apellido'; scrollToField('apellido'); }}
                    onSelectionChange={() => { activeFieldKeyRef.current = 'apellido'; setTimeout(() => scrollToField('apellido'), 40); }}
                  />
                </View>
              </View>

              {/* Teléfono (forzando prefijo +56 9) */}
              <View style={styles.fieldContainer} onLayout={rememberFieldY('telefono')}>
                <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>Teléfono</Text>
                <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                  <IconSymbol name="phone" size={20} color={accentColor} />
                  <TextInput
                    style={[styles.input, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                    value={telefono}
                    onChangeText={(t) => {
                      // Si borra todo, permite vacío
                      const rawDigits = (t || '').replace(/\D/g, '');
                      if (!rawDigits) { setTelefono(''); return; }
                      // Mantener siempre prefijo +56 9 y hasta 8 dígitos
                      const tail = rawDigits.replace(/^(?:56)?9?/, '').slice(0, 8);
                      setTelefono(`+56 9 ${tail}`);
                    }}
                    onFocus={() => {
                      activeFieldKeyRef.current = 'telefono';
                      scrollToField('telefono');
                      // Si está vacío al comenzar a escribir, inyectar prefijo
                      if (!telefono) setTelefono('+56 9 ');
                    }}
                    onBlur={() => {
                      // Si quedó solo el prefijo sin dígitos, limpiar a vacío
                      const digits = telefono.replace(/\D/g, '');
                      if (!digits || /^(?:56)?9?$/.test(digits)) setTelefono('');
                    }}
                    placeholder="+56 9 12345678"
                    placeholderTextColor={mutedColor}
                    keyboardType="phone-pad"
                    editable={!saving}
                    onSelectionChange={() => { activeFieldKeyRef.current = 'telefono'; setTimeout(() => scrollToField('telefono'), 40); }}
                  />
                </View>
                <Text style={[styles.helpText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}> 
                  Siempre comienza con +56 9 y escribe 8 dígitos
                </Text>
              </View>
            </ScrollView>

            {/* Botones de acción */}
            <View
              style={[
                styles.footer,
                { paddingBottom: 16 + (keyboardHeight > 0 ? 0 : insets.bottom), paddingTop: 16 },
              ]}
            >
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
          </KeyboardAvoidingView>
        </View>
      </View>
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
    paddingVertical: 0,
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
