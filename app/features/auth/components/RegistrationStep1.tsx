import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface RegistrationStep1Props {
  onNext: (data: { nombre: string; apellido: string }) => void;
  onCancel: () => void;
  initialData?: { nombre: string; apellido: string };
  onInputFocus?: (inputName: 'nombre' | 'apellido') => void;
}

export function RegistrationStep1({ onNext, onCancel, initialData, onInputFocus }: RegistrationStep1Props) {
  const labelColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({ light: '#9CA3AF', dark: '#FFFFFF' }, 'icon');
  const inputBg = useThemeColor({ light: '#F8F9FA', dark: '#000000' }, 'background');
  const inputBorder = useThemeColor({ light: '#E9ECEF', dark: '#FFFFFF' }, 'icon');
  const inputTextColor = useThemeColor({}, 'text');
  const [nombre, setNombre] = useState(initialData?.nombre || '');
  const [apellido, setApellido] = useState(initialData?.apellido || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Esta función será llamada por el botón circular externo
  React.useEffect(() => {
    // Exponer la función de validación globalmente para el botón externo
    (global as any).validateStep1 = () => {
      const data = {
        nombre: nombre.trim(),
        apellido: apellido.trim()
      };

      // Validación simple sin try/catch
      const newErrors: Record<string, string> = {};
      
      if (!data.nombre) {
        newErrors.nombre = 'El nombre es requerido';
      }
      if (!data.apellido) {
        newErrors.apellido = 'El apellido es requerido';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        // Actualizar errores globalmente
        if ((global as any).setStep1Errors) {
          (global as any).setStep1Errors(newErrors);
        }
        return false;
      }

      setErrors({});
      // Limpiar errores globalmente
      if ((global as any).setStep1Errors) {
        (global as any).setStep1Errors({});
      }
      onNext(data);
      return true;
    };
  }, [nombre, apellido, onNext]);

  // Sincronizar errores locales con el sistema global
  React.useEffect(() => {
    if ((global as any).setStep1Errors) {
      (global as any).setStep1Errors(errors);
    }
  }, [errors]);

  return (
    <View style={styles.container}>
      <View style={styles.inputSection}>
        <Text style={[styles.label, { color: labelColor }]}>Nombre</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: inputBg, borderColor: inputBorder, color: inputTextColor },
            errors.nombre && styles.inputError,
          ]}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Nombre"
          autoCapitalize="words"
          autoComplete="name"
          placeholderTextColor={placeholderColor}
          onFocus={() => (global as any).handleInputFocus?.('nombre')}
          onBlur={() => (global as any).handleInputBlur?.()}
        />
        {errors.nombre && (
          <Text style={styles.errorText}>{errors.nombre}</Text>
        )}
      </View>

      <View style={styles.inputSection}>
        <Text style={[styles.label, { color: labelColor }]}>Apellido</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: inputBg, borderColor: inputBorder, color: inputTextColor },
            errors.apellido && styles.inputError,
          ]}
          value={apellido}
          onChangeText={setApellido}
          placeholder="Apellido"
          autoCapitalize="words"
          autoComplete="family-name"
          placeholderTextColor={placeholderColor}
          onFocus={() => {
            if (typeof onInputFocus === 'function') {
              onInputFocus('apellido');
            }
            (global as any).handleInputFocus?.('apellido');
          }}
          onBlur={() => (global as any).handleInputBlur?.()}
        />
        {errors.apellido && (
          <Text style={styles.errorText}>{errors.apellido}</Text>
        )}
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  container: { 
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  inputSection: { 
    width: '100%',
    justifyContent: 'center',
    alignItems: 'stretch',
    marginBottom: 20, // Espaciado ligeramente mayor para evitar recortes
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 6,
    color: '#333',
    textAlign: 'left',
  },
  input: { 
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    color: '#333',
    minHeight: 50, // Exactamente igual que signIn
  },
  inputError: { 
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: { 
    color: '#EF4444', 
    fontSize: 13, 
    marginTop: 6,
    marginLeft: 4,
  },
});