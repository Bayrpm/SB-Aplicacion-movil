import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { registrationStep1Schema } from '../schemas/registration.schema';
import type { RegistrationStep1Data } from '../types';

interface RegistrationStep1Props {
  onNext: (data: RegistrationStep1Data) => void;
  onCancel: () => void;
}

export function RegistrationStep1({ onNext, onCancel }: RegistrationStep1Props) {
  const [nombre, setNombre] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNext = () => {
    const validation = registrationStep1Schema.safeParse({ nombre });
    
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onNext(validation.data);
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <ThemedText style={styles.cancelButtonText}>← Volver</ThemedText>
      </TouchableOpacity>

      <ThemedText style={styles.title}>¿Cuál es tu nombre?</ThemedText>
      <ThemedText style={styles.subtitle}>Comenzamos con lo básico</ThemedText>

      <View style={styles.inputContainer}>
        <ThemedText style={styles.label}>Nombre completo</ThemedText>
        <TextInput
          style={[styles.input, errors.nombre && styles.inputError]}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Juan Pérez"
          autoCapitalize="words"
          autoComplete="name"
        />
        {errors.nombre && (
          <ThemedText style={styles.errorText}>{errors.nombre}</ThemedText>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <ThemedText style={styles.buttonText}>Continuar</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  cancelButton: { marginBottom: 24 },
  cancelButtonText: { color: '#007AFF', fontSize: 18, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, opacity: 0.7, marginBottom: 32 },
  inputContainer: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 14, fontSize: 16, backgroundColor: '#FFFFFF' },
  inputError: { borderColor: '#FF3B30' },
  errorText: { color: '#FF3B30', fontSize: 12, marginTop: 4 },
  button: { backgroundColor: '#007AFF', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});