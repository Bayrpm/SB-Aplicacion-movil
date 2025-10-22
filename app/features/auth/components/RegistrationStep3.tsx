import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { registrationStep3Schema } from '../schemas/registration.schema';
import type { RegistrationStep3Data } from '../types';

interface RegistrationStep3Props {
  onNext: (data: RegistrationStep3Data) => void;
  onBack: () => void;
  initialData?: { email: string; password: string };
  onInputFocus?: (inputName: 'email' | 'password') => void;
}

export function RegistrationStep3({ onNext, onBack, initialData, onInputFocus }: RegistrationStep3Props) {
  const labelColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({ light: '#9CA3AF', dark: '#FFFFFF' }, 'icon');
  const inputBg = useThemeColor({ light: '#F8F9FA', dark: '#000000' }, 'background');
  const inputBorder = useThemeColor({ light: '#E9ECEF', dark: '#FFFFFF' }, 'icon');
  const inputTextColor = useThemeColor({}, 'text');
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState(initialData?.password || '');
  const passwordRef = useRef<TextInput | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    (global as any).validateStep3 = () => {
      const data = {
          email: email.trim(),
          password,
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
        if ((global as any).setStep3Errors) {
          (global as any).setStep3Errors(fieldErrors);
        }
        // Si hay errores relacionados con la contraseña, enfocar el input para que
        // el usuario vea rápidamente los requisitos incumplidos.
        const hasPasswordError = validation.error.errors.some(e => e.path[0] === 'password');
        if (hasPasswordError) {
          try { passwordRef.current?.focus(); } catch (e) { /* noop */ }
        }
        return false;
      }
      setErrors({});
      if ((global as any).setStep3Errors) {
        (global as any).setStep3Errors({});
      }
      onNext({ email: data.email, password: data.password });
      return true;
    };
  }, [email, password, onNext]);

  React.useEffect(() => {
    if ((global as any).setStep3Errors) {
      (global as any).setStep3Errors(errors);
    }
  }, [errors]);

  const minLength = 8;
  const hasMinLength = password.length >= minLength;
  const digitMatches = password.match(/\d/g) || [];
  const hasTwoNumbers = digitMatches.length >= 2;
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const passwordRules: { label: string; valid: boolean }[] = [
    {
      label: `Mínimo ${minLength} caracteres`,
      valid: hasMinLength,
    },
    {
      label: 'Al menos 2 números',
      valid: hasTwoNumbers,
    },
    {
      label: 'Al menos un carácter especial',
      valid: hasSpecial,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.inputSection}>
        <Text style={[styles.label, { color: labelColor }]}>Email</Text>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: inputTextColor }, errors.email && styles.inputError]}
          value={email}
          onChangeText={setEmail}
          placeholder="tu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholderTextColor={placeholderColor}
          onFocus={() => {
            // No disparar el handler global aquí para evitar el scroll automático
            // cuando el usuario solo toca el campo email.
            // Si el contenedor exterior necesita una notificación, usará la prop onInputFocus.
            if (typeof onInputFocus === 'function') {
              onInputFocus('email');
            }
          }}
          onBlur={() => (global as any).handleInputBlur?.()}
        />
        {errors.email && (
          <Text style={styles.errorText}>{errors.email}</Text>
        )}
      </View>

      <View style={styles.inputSection}>
        <Text style={[styles.label, { color: labelColor }]}>Contraseña</Text>
        <View style={[styles.passwordContainer, { backgroundColor: inputBg, borderColor: inputBorder }, errors.password && styles.inputError]}>
          <TextInput
            ref={passwordRef}
            style={[styles.passwordInput, { color: inputTextColor }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Tu contraseña"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            placeholderTextColor={placeholderColor}
            underlineColorAndroid="transparent"
            onFocus={() => {
              if (typeof (global as any).handleInputFocus === 'function') {
                (global as any).handleInputFocus('password');
              }
              if (typeof onInputFocus === 'function') {
                onInputFocus('password');
              }
            }}
            onBlur={() => (global as any).handleInputBlur?.()}
          />
          <TouchableOpacity
            style={styles.showPasswordButton}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={22}
              color={useThemeColor({ light: '#0A4A90', dark: '#BFC7CC' }, 'tint')}
            />
          </TouchableOpacity>
        </View>
        {/* No mostrar el error de validación de contraseña aquí, solo los requisitos */}
        {/* Los requisitos SIEMPRE dentro de la card, debajo del input y error */}
        <View style={styles.passwordRulesContainer}>
          {passwordRules.map((rule, idx) => (
            <View key={idx} style={styles.passwordRuleRow}>
              <View style={{ marginRight: 6 }}>
                <Ionicons
                  name={rule.valid ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={rule.valid ? '#22C55E' : '#EF4444'}
                />
              </View>
              <Text style={{
                color: rule.valid ? '#22C55E' : '#EF4444',
                fontSize: 11,
                paddingVertical: 1,
                flexShrink: 1,
                flexWrap: 'wrap',
              }}>
                {rule.label}
              </Text>
            </View>
          ))}
        </View>
        {/* confirmPassword removed by request; only email + password remain */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  showPasswordButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 4,
  },
  // Eliminadas duplicadas arriba
  container: {
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'stretch'
  },
  inputSection: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'stretch',
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
    textAlign: 'left'
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
    minHeight: 50
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2'
    ,
    borderRadius: 12
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
    marginBottom: 0,
    maxWidth: '100%',
    alignSelf: 'stretch'
  },
  passwordContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingRight: 4
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
    minHeight: 50
  },
  passwordRulesContainer: {
    marginTop: 10,
    marginBottom: 16,
    paddingBottom: 16,
    paddingTop: 6,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    alignSelf: 'stretch',
    maxWidth: '100%',
    flexShrink: 1,
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  passwordRuleRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 2,
  flexWrap: 'wrap',
  flexShrink: 1
  }
});
