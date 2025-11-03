import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
interface RegistrationStep2Props {
  onNext: (data: { telefono: string }) => void;
  onSkip: () => void;
  onBack: () => void;
  initialData?: { telefono?: string };
}

export function RegistrationStep2({ onNext, onSkip, onBack, initialData }: RegistrationStep2Props) {
  const labelColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({ light: '#9CA3AF', dark: '#FFFFFF' }, 'icon');
    const scheme = useColorScheme();
    const inputBg = useThemeColor({ light: '#F8F9FA', dark: '#000000' }, 'background');
    const errorBg = scheme === 'dark' ? '#222' : '#fff';
  const inputBorder = useThemeColor({ light: '#E9ECEF', dark: '#FFFFFF' }, 'icon');
  const inputTextColor = useThemeColor({}, 'text');
  const [telefono, setTelefono] = useState(initialData?.telefono || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Formatear teléfono chileno
  const formatChileanPhone = (value: string) => {
    // Remover todo excepto números
    const numbers = value.replace(/\D/g, '');
    
    // Si comienza con 56, es código de país de Chile
    if (numbers.startsWith('56')) {
      const localNumber = numbers.substring(2);
      if (localNumber.length <= 1) return '+56 ';
      if (localNumber.length <= 2) return `+56 ${localNumber}`;
      if (localNumber.length <= 6) return `+56 ${localNumber.substring(0, 1)} ${localNumber.substring(1)}`;
      return `+56 ${localNumber.substring(0, 1)} ${localNumber.substring(1, 5)} ${localNumber.substring(5, 9)}`;
    }
    
    // Si comienza con 9 (celular chileno sin código de país)
    if (numbers.startsWith('9')) {
      if (numbers.length <= 1) return '+56 9';
      if (numbers.length <= 5) return `+56 9 ${numbers.substring(1)}`;
      return `+56 9 ${numbers.substring(1, 5)} ${numbers.substring(5, 9)}`;
    }
    
    // Para otros números, agregar +56 automáticamente
    if (numbers.length > 0) {
      if (numbers.length <= 1) return `+56 ${numbers}`;
      if (numbers.length <= 5) return `+56 ${numbers.substring(0, 1)} ${numbers.substring(1)}`;
      return `+56 ${numbers.substring(0, 1)} ${numbers.substring(1, 5)} ${numbers.substring(5, 9)}`;
    }
    
    return value;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatChileanPhone(value);
    setTelefono(formatted);
    setErrors({});
  };

  // Exponer la función de validación globalmente para el botón externo
  React.useEffect(() => {
    (global as any).validateStep2 = (omitir = false) => {
      const trimmedPhone = telefono.trim();
      
      // El teléfono ahora es obligatorio
      if (!trimmedPhone) {
        setErrors({ telefono: 'El teléfono es requerido' });
        return false;
      }
      
      // Validar formato chileno
      if (!trimmedPhone.match(/^\+56 [0-9] \d{4} \d{4}$/)) {
        setErrors({ telefono: 'Formato inválido. Debe ser: +56 9 1234 5678' });
        return false;
      }
      
      onNext({ telefono: trimmedPhone });
      return true;
    };

    // Exponer función para obtener el valor actual del teléfono
    (global as any).getCurrentPhone = () => {
      return telefono.trim();
    };
  }, [telefono, onNext, onSkip]);

  return (
    <View style={styles.container}>
      <View style={styles.inputSection}>
        <Text style={[styles.label, { color: labelColor }]}>
          Teléfono <Text style={{ color: '#EF4444' }}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: inputBg, borderColor: errors.telefono ? '#EF4444' : inputBorder, color: inputTextColor },
          ]}
          value={telefono}
          onChangeText={handlePhoneChange}
          placeholder="+56 9 1234 5678"
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={17} // +56 9 1234 5678
          placeholderTextColor={errors.telefono ? '#EF4444' : placeholderColor}
        />
        {errors.telefono && (
          <Text style={styles.errorText}>{errors.telefono}</Text>
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

// Default export for expo-router route detection
export default RegistrationStep2;