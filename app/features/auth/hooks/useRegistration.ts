import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { signUpUser } from '../api/auth.api';
import { registrationStep3Schema } from '../schemas/registration.schema';
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

    // Validación extra en el cliente: asegurarnos de que la contraseña cumple
    // los requisitos antes de enviar al backend. Defensa en profundidad.
    try {
      const validation = registrationStep3Schema.safeParse({ email: step3Data.email, password: step3Data.password });
      if (!validation.success) {
        // Construir mensaje concatenado de errores relevantes
        const msgs: string[] = [];
        validation.error.errors.forEach((err) => {
          if (err.message) msgs.push(err.message);
        });
        const message = msgs.length > 0 ? msgs.join('\n') : 'La contraseña no cumple los requisitos';
  AppAlert.alert('Error en la contraseña', message);
        setLoading(false);
        return;
      }
    } catch (e) {
      // Si algo raro ocurre, no bloquear por error de validación local; continuar y dejar que el backend valide
    }

    if (!step1 || !step3Data) {
  AppAlert.alert('Error en el registro', 'Datos de registro incompletos');
      setLoading(false);
      return;
    }

    let authResult;

    try {
      // Enviar datos del usuario a Supabase Auth
      const userDataToSend = {
        nombre: step1.nombre,
        apellido: step1.apellido,
        telefono: step2?.telefono
      };
      authResult = await signUpUser(step3Data.email, step3Data.password, userDataToSend);

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

  AppAlert.alert(errorTitle, errorMessage);
        setLoading(false);
        return;
      }

      if (!authResult.user) {
  AppAlert.alert('Error en el registro', 'No se pudo crear el usuario');
        setLoading(false);
        return;
      }

      
    } catch (error) {
      console.error('❌ Error en el registro:', error);
  AppAlert.alert('Error en el registro', 'Ocurrió un error inesperado durante el registro');
      setLoading(false);
      return;
    }

    try {
      // El perfil se creará automáticamente por el trigger de Supabase
      // Solo si no hay sesión (requiere verificación de email)
      if (!authResult.session) {
        AppAlert.alert(
          '¡Registro exitoso!',
          'Se ha enviado un correo para verificar tu cuenta. Por favor, revisa tu bandeja de entrada y verifica tu email para activar tu cuenta.',
          [{ 
            text: 'Entendido',
            onPress: () => {
              setRegistrationData({});
              setCurrentStep(1);
              router.replace('/(auth)'); // Esto llevará al welcomeScreen
            }
          }]
        );
      } else {
      
        AppAlert.alert(
          '¡Bienvenido!',
          'Tu cuenta ha sido creada exitosamente.',
          [{ 
            text: 'Continuar',
            onPress: () => {
              setRegistrationData({});
              setCurrentStep(1);
              // Si hay sesión, el AuthContext redirigirá automáticamente a (tabs)
            }
          }]
        );
      }
    } catch (error) {
      console.error('Error en proceso post-registro:', error);
      // Aún mostrar éxito porque el usuario se creó
      AppAlert.alert(
        '¡Registro exitoso!',
        'Se ha enviado un correo para verificar tu cuenta. Por favor, revisa tu bandeja de entrada para activar tu cuenta.',
        [{ 
          text: 'Entendido',
          onPress: () => {
            setRegistrationData({});
            setCurrentStep(1);
            router.replace('/(auth)'); // Esto llevará al welcomeScreen
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

  // Funciones helper para obtener datos específicos de cada step
  const getStep1Data = (): RegistrationStep1Data | undefined => {
    return registrationData.step1;
  };

  const getStep2Data = (): RegistrationStep2Data | undefined => {
    return registrationData.step2;
  };

  const getStep3Data = (): RegistrationStep3Data | undefined => {
    return registrationData.step3;
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
    // Helper functions para acceder a datos específicos
    getStep1Data,
    getStep2Data,
    getStep3Data,
  };
}

export default useRegistration;
