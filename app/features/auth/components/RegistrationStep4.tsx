import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { registrationStep4Schema } from '../schemas/registration.schema';
import type { RegistrationStep4Data } from '../types';

interface RegistrationStep4Props {
  onNext: (data: RegistrationStep4Data) => void;
  onBack: () => void;
  loading: boolean;
}

export function RegistrationStep4({ onNext, onBack, loading }: RegistrationStep4Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNext = () => {
    const validation = registrationStep4Schema.safeParse({ password, confirmPassword });
    
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
      <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={loading}>
        <ThemedText style={styles.backButtonText}>← Atrás</ThemedText>
      </TouchableOpacity>

      <ThemedText style={styles.title}>Crea tu contraseña</ThemedText>
      <ThemedText style={styles.subtitle}>Elige una contraseña segura</ThemedText>

      <View style={styles.inputContainer}>
        <ThemedText style={styles.label}>Contraseña</ThemedText>
        <TextInput
          style={[styles.input, errors.password && styles.inputError]}
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo 8 caracteres"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        {errors.password && (
          <ThemedText style={styles.errorText}>{errors.password}</ThemedText>
        )}
      </View>

      <View style={styles.inputContainer}>
        <ThemedText style={styles.label}>Confirmar contraseña</ThemedText>
        <TextInput
          style={[styles.input, errors.confirmPassword && styles.inputError]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repite tu contraseña"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        {errors.confirmPassword && (
          <ThemedText style={styles.errorText}>{errors.confirmPassword}</ThemedText>
        )}
      </View>

      <TouchableOpacity
        style={styles.showPasswordButton}
        onPress={() => setShowPassword(!showPassword)}
      >
        <ThemedText style={styles.showPasswordText}>
          {showPassword ? '🔒 Ocultar contraseña' : '👁️ Mostrar contraseña'}
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleNext} disabled={loading}>
        <ThemedText style={styles.buttonText}>
          {loading ? 'Registrando...' : 'Completar registro'}
        </ThemedText>
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
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 14, fontSize: 16, backgroundColor: '#FFFFFF' },
  inputError: { borderColor: '#FF3B30' },
  errorText: { color: '#FF3B30', fontSize: 12, marginTop: 4 },
  showPasswordButton: { marginBottom: 24 },
  showPasswordText: { fontSize: 14, color: '#007AFF' },
  button: { backgroundColor: '#007AFF', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});