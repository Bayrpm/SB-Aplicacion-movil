import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface RegistrationStep1Props {
  onNext: (data: { nombre: string; apellido: string }) => void;
  onCancel: () => void;
}

export function RegistrationStep1({ onNext, onCancel }: RegistrationStep1Props) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
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
        return false;
      }

      setErrors({});
      onNext(data);
      return true;
    };

    // Exponer función para detectar si hay errores activos
    (global as any).hasStep1Errors = () => {
      return Object.keys(errors).length > 0;
    };
  }, [nombre, apellido, onNext, errors]);

  return (
    <View style={styles.container}>
      <View style={styles.inputSection}>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={[styles.input, errors.nombre && styles.inputError]}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Juan Carlos"
          autoCapitalize="words"
          autoComplete="name"
          placeholderTextColor="#999"
          onFocus={() => (global as any).handleInputFocus?.('nombre')}
          onBlur={() => (global as any).handleInputBlur?.()}
        />
        {errors.nombre && (
          <Text style={styles.errorText}>{errors.nombre}</Text>
        )}
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.label}>Apellido</Text>
        <TextInput
          style={[styles.input, errors.apellido && styles.inputError]}
          value={apellido}
          onChangeText={setApellido}
          placeholder="Pérez González"
          autoCapitalize="words"
          autoComplete="family-name"
          placeholderTextColor="#999"
          onFocus={() => (global as any).handleInputFocus?.('apellido')}
          onBlur={() => (global as any).handleInputBlur?.()}
        />
        {errors.apellido && (
          <Text style={styles.errorText}>{errors.apellido}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  inputSection: { 
    width: '100%',
    justifyContent: 'center',
    alignItems: 'stretch',
    marginBottom: 16, // Espaciado igual que signIn
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
    paddingVertical: 14,
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