import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { createCitizenProfile, signUpUser } from '../api/auth.api';
import type {
  RegistrationStep1Data,
  RegistrationStep2Data,
  RegistrationStep3Data
} from '../types';

export function useRegistration() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [registrationData, setRegistrationData] = useState<{
    step1?: RegistrationStep1Data;
    step2?: RegistrationStep2Data;
    step3?: RegistrationStep3Data;
  }>({});

  // Reset automático cuando se monta el hook
  React.useEffect(() => {
    return () => {
      // Cleanup al desmontar
      setCurrentStep(1);
      setLoading(false);
      setRegistrationData({});
    };
  }, []);

  const saveStep1Data = (data: RegistrationStep1Data) => {
    setRegistrationData(prev => ({ ...prev, step1: data }));
    setCurrentStep(2);
  };

  const saveStep2Data = (data: RegistrationStep2Data) => {
    setRegistrationData(prev => ({ ...prev, step2: data }));
    setCurrentStep(3);
  };

  const saveStep3Data = async (data: RegistrationStep3Data) => {
    setRegistrationData(prev => ({ ...prev, step3: data }));
    await completeRegistration(data);
  };

  const skipStep2 = () => {
    setRegistrationData(prev => ({ ...prev, step2: { telefono: undefined } }));
    setCurrentStep(3);
  };

  const completeRegistration = async (step3Data: RegistrationStep3Data) => {
    setLoading(true);
    
    const { step1, step2 } = registrationData;

    if (!step1 || !step3Data) {
      Alert.alert('Error en el registro', 'Datos de registro incompletos');
      setLoading(false);
      return;
    }

    const authResult = await signUpUser(step3Data.email, step3Data.password);

    if (authResult.error) {
      let errorMessage = 'Ocurrió un error inesperado';
      let errorTitle = 'Error en el registro';

      if (authResult.error.message) {
        if (authResult.error.message.includes('ya está registrado') || 
            authResult.error.message.includes('User already registered') ||
            authResult.error.message.includes('already been registered') ||
            authResult.error.message.includes('Email address is already registered')) {
          errorTitle = 'Usuario existente';
          errorMessage = 'Este email ya está registrado. Intenta iniciar sesión en su lugar.';
        } else if (authResult.error.message.includes('Invalid email')) {
          errorMessage = 'El formato del email no es válido';
        } else if (authResult.error.message.includes('Password should be at least')) {
          errorMessage = 'La contraseña debe tener al menos 6 caracteres';
        } else {
          errorMessage = authResult.error.message;
        }
      }

      Alert.alert(errorTitle, errorMessage);
      setLoading(false);
      return;
    }

    if (!authResult.user) {
      Alert.alert('Error en el registro', 'No se pudo crear el usuario');
      setLoading(false);
      return;
    }

    const profileResult = await createCitizenProfile({
      usuario_id: authResult.user.id,
      nombre: step1.nombre,
      apellido: step1.apellido,
      email: step3Data.email,
      telefono: step2?.telefono || undefined
    });

    if (profileResult.error) {
      console.error('Error creando perfil:', profileResult.error);
      Alert.alert('Error en el registro', profileResult.error.message || 'Error al crear el perfil de usuario');
      setLoading(false);
      return;
    }

    if (!authResult.session) {
      Alert.alert(
        '¡Registro exitoso!',
        'Por favor, verifica tu email para activar tu cuenta.',
        [{ 
          text: 'Entendido',
          onPress: () => router.replace('/(auth)')
        }]
      );
    } else {
      Alert.alert(
        '¡Bienvenido!',
        'Tu cuenta ha sido creada exitosamente.',
        [{ 
          text: 'Continuar',
          onPress: () => {
            // Si hay sesión, el AuthContext redirigirá automáticamente a (tabs)
          }
        }]
      );
    }

    setRegistrationData({});
    setCurrentStep(1);
    setLoading(false);
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const cancelRegistration = () => {
    setRegistrationData({});
    setCurrentStep(1);
    router.replace('/(auth)');
  };

  return {
    currentStep,
    loading,
    saveStep1Data,
    saveStep2Data,
    saveStep3Data,
    skipStep2,
    goBack,
    cancelRegistration,
    registrationData,
  };
}
