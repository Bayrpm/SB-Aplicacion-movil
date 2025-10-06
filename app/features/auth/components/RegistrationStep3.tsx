import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { registrationStep3Schema } from '../schemas/registration.schema';
import type { RegistrationStep3Data } from '../types';

interface RegistrationStep3Props {
  onNext: (data: RegistrationStep3Data) => void;
  onBack: () => void;
}

export function RegistrationStep3({ onNext, onBack }: RegistrationStep3Props) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNext = () => {
    const validation = registrationStep3Schema.safeParse({ email });
    
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
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <ThemedText style={styles.backButtonText}>← Atrás</ThemedText>
      </TouchableOpacity>

      <ThemedText style={styles.title}>¿Cuál es tu email?</ThemedText>
      <ThemedText style={styles.subtitle}>Lo usarás para iniciar sesión</ThemedText>

      <View style={styles.inputContainer}>
        <ThemedText style={styles.label}>Email</ThemedText>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={email}
          onChangeText={setEmail}
          placeholder="correo@ejemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        {errors.email && (
          <ThemedText style={styles.errorText}>{errors.email}</ThemedText>
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
  backButton: { marginBottom: 24 },
  backButtonText: { color: '#007AFF', fontSize: 16 },
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