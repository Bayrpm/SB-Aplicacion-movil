import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { registrationStep3Schema } from '../schemas/registration.schema';
import type { RegistrationStep3Data } from '../types';

interface RegistrationStep3Props {
  onNext: (data: RegistrationStep3Data) => void;
  onBack: () => void;
  initialData?: { email: string; password: string };
}

export function RegistrationStep3({ onNext, onBack, initialData }: RegistrationStep3Props) {
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState(initialData?.password || '');
  const [confirmPassword, setConfirmPassword] = useState(initialData?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Exponer la función de validación globalmente para el botón externo
  React.useEffect(() => {
    (global as any).validateStep3 = () => {
      const data = {
        email: email.trim(),
        password,
        confirmPassword
      };

      const validation = registrationStep3Schema.safeParse(data);
      
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        // Actualizar errores globalmente
        if ((global as any).setStep3Errors) {
          (global as any).setStep3Errors(fieldErrors);
        }
        return false;
      }

      setErrors({});
      // Limpiar errores globalmente
      if ((global as any).setStep3Errors) {
        (global as any).setStep3Errors({});
      }
      onNext({ email: data.email, password: data.password });
      return true;
    };
  }, [email, password, confirmPassword, onNext]);

  // Sincronizar errores locales con el sistema global
  React.useEffect(() => {
    if ((global as any).setStep3Errors) {
      (global as any).setStep3Errors(errors);
    }
  }, [errors]);

  return (
    <View style={styles.container}>
      <View style={styles.inputSection}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={email}
          onChangeText={setEmail}
          placeholder="tu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholderTextColor="#999"
          onFocus={() => (global as any).handleInputFocus?.('email')}
          onBlur={() => (global as any).handleInputBlur?.()}
        />
        {errors.email && (
          <Text style={styles.errorText}>{errors.email}</Text>
        )}
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.label}>Contraseña</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.passwordInput, errors.password && styles.inputError]}
            value={password}
            onChangeText={setPassword}
            placeholder="Tu contraseña"
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            placeholderTextColor="#999"
            onFocus={() => (global as any).handleInputFocus?.('password')}
            onBlur={() => (global as any).handleInputBlur?.()}
          />
          <TouchableOpacity
            style={styles.showPasswordButton}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            <Text style={styles.showPasswordText}>
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </Text>
          </TouchableOpacity>
        </View>
        {errors.password && (
          <Text style={styles.errorText}>{errors.password}</Text>
        )}
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.label}>Confirmar contraseña</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.passwordInput, errors.confirmPassword && styles.inputError]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirma tu contraseña"
            secureTextEntry={!showConfirmPassword}
            autoComplete="new-password"
            placeholderTextColor="#999"
            onFocus={() => (global as any).handleInputFocus?.('confirmPassword')}
            onBlur={() => (global as any).handleInputBlur?.()}
          />
          <TouchableOpacity
            style={styles.showPasswordButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            activeOpacity={0.7}
          >
            <Text style={styles.showPasswordText}>
              {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
            </Text>
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && (
          <Text style={styles.errorText}>{errors.confirmPassword}</Text>
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
  passwordContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingRight: 4,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    minHeight: 50,
  },
  showPasswordButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 4,
  },
  showPasswordText: {
    fontSize: 14,
    color: '#0A4A90',
    fontWeight: '600',
  },
});