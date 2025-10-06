import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { signUpUser } from '../api/auth.api';
import type {
  RegistrationStep1Data,
  RegistrationStep2Data,
  RegistrationStep3Data,
  RegistrationStep4Data
} from '../types';

export function useRegistration() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [registrationData, setRegistrationData] = useState<{
    step1?: RegistrationStep1Data;
    step2?: RegistrationStep2Data;
    step3?: RegistrationStep3Data;
    step4?: RegistrationStep4Data;
  }>({});

  const saveStep1Data = (data: RegistrationStep1Data) => {
    setRegistrationData(prev => ({ ...prev, step1: data }));
    setCurrentStep(2);
  };

  const saveStep2Data = (data: RegistrationStep2Data) => {
    setRegistrationData(prev => ({ ...prev, step2: data }));
    setCurrentStep(3);
  };

  const saveStep3Data = (data: RegistrationStep3Data) => {
    setRegistrationData(prev => ({ ...prev, step3: data }));
    setCurrentStep(4);
  };

  const saveStep4Data = async (data: RegistrationStep4Data) => {
    setRegistrationData(prev => ({ ...prev, step4: data }));
    await completeRegistration(data);
  };

  const skipStep2 = () => {
    setRegistrationData(prev => ({ ...prev, step2: { telefono: undefined } }));
    setCurrentStep(3);
  };

  const completeRegistration = async (step4Data: RegistrationStep4Data) => {
    setLoading(true);
    
    try {
      const { step1, step2, step3 } = registrationData;

      if (!step1 || !step3) {
        throw new Error('Datos de registro incompletos');
      }

      const authResult = await signUpUser(step3.email, step4Data.password);

      if (!authResult.user) {
        throw new Error('No se pudo crear el usuario');
      }

      if (!authResult.session) {
        Alert.alert(
          '¡Registro exitoso!',
          'Por favor, verifica tu email para activar tu cuenta.',
          [{ 
            text: 'Entendido',
            onPress: () => router.replace('/(auth)' as any)
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
      
    } catch (error: any) {
      Alert.alert(
        'Error en el registro',
        error.message || 'Ocurrió un error inesperado'
      );
    } finally {
      setLoading(false);
    }
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
    saveStep4Data,
    skipStep2,
    goBack,
    cancelRegistration,
    registrationData,
  };
}
