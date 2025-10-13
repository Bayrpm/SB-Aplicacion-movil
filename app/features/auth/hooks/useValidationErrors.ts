import React from 'react';

interface ValidationErrorsState {
  step1Errors: Record<string, string>;
  step2Errors: Record<string, string>;
  step3Errors: Record<string, string>;
}

interface UseValidationErrorsReturn {
  hasStep1Errors: () => boolean;
  hasStep2Errors: () => boolean;
  hasStep3Errors: () => boolean;
  hasAnyErrors: () => boolean;
  getErrorCount: (step: number) => number;
  clearStepErrors: (step: number) => void;
  clearAllErrors: () => void;
}

export function useValidationErrors(): UseValidationErrorsReturn {
  const [errors, setErrors] = React.useState<ValidationErrorsState>({
    step1Errors: {},
    step2Errors: {},
    step3Errors: {},
  });

  // Exponer funciones globalmente para que los componentes puedan acceder
  React.useEffect(() => {
    // Funciones para detectar errores
    (global as any).hasStep1Errors = () => Object.keys(errors.step1Errors).length > 0;
    (global as any).hasStep2Errors = () => Object.keys(errors.step2Errors).length > 0;
    (global as any).hasStep3Errors = () => Object.keys(errors.step3Errors).length > 0;
    
    // Funciones para actualizar errores
    (global as any).setStep1Errors = (newErrors: Record<string, string>) => {
      setErrors(prev => ({ ...prev, step1Errors: newErrors }));
    };
    
    (global as any).setStep2Errors = (newErrors: Record<string, string>) => {
      setErrors(prev => ({ ...prev, step2Errors: newErrors }));
    };
    
    (global as any).setStep3Errors = (newErrors: Record<string, string>) => {
      setErrors(prev => ({ ...prev, step3Errors: newErrors }));
    };

    // Función para obtener errores específicos
    (global as any).getStep1Errors = () => errors.step1Errors;
    (global as any).getStep2Errors = () => errors.step2Errors;
    (global as any).getStep3Errors = () => errors.step3Errors;
  }, [errors]);

  const hasStep1Errors = React.useCallback(() => {
    return Object.keys(errors.step1Errors).length > 0;
  }, [errors.step1Errors]);

  const hasStep2Errors = React.useCallback(() => {
    return Object.keys(errors.step2Errors).length > 0;
  }, [errors.step2Errors]);

  const hasStep3Errors = React.useCallback(() => {
    return Object.keys(errors.step3Errors).length > 0;
  }, [errors.step3Errors]);

  const hasAnyErrors = React.useCallback(() => {
    return hasStep1Errors() || hasStep2Errors() || hasStep3Errors();
  }, [hasStep1Errors, hasStep2Errors, hasStep3Errors]);

  const getErrorCount = React.useCallback((step: number) => {
    switch (step) {
      case 1: return Object.keys(errors.step1Errors).length;
      case 2: return Object.keys(errors.step2Errors).length;
      case 3: return Object.keys(errors.step3Errors).length;
      default: return 0;
    }
  }, [errors]);

  const clearStepErrors = React.useCallback((step: number) => {
    switch (step) {
      case 1:
        setErrors(prev => ({ ...prev, step1Errors: {} }));
        break;
      case 2:
        setErrors(prev => ({ ...prev, step2Errors: {} }));
        break;
      case 3:
        setErrors(prev => ({ ...prev, step3Errors: {} }));
        break;
    }
  }, []);

  const clearAllErrors = React.useCallback(() => {
    setErrors({
      step1Errors: {},
      step2Errors: {},
      step3Errors: {},
    });
  }, []);

  return {
    hasStep1Errors,
    hasStep2Errors,
    hasStep3Errors,
    hasAnyErrors,
    getErrorCount,
    clearStepErrors,
    clearAllErrors,
  };
}