import { useResponsiveLayout } from './useResponsiveLayout';
import { useValidationErrors } from './useValidationErrors';

interface UseAuthScreenLayoutOptions {
  screenType: 'signIn' | 'signUp' | 'welcome' | 'splash';
  currentStep?: number;
  keyboardVisible: boolean;
  keyboardHeight: number;
}

interface UseAuthScreenLayoutReturn {
  layout: ReturnType<typeof useResponsiveLayout>;
  validation: ReturnType<typeof useValidationErrors>;
  screenConfig: {
    showProgressBar: boolean;
    showSteps: boolean;
    cardConfig: {
      height: number;
      top: number;
      titleTop?: number;
    };
    buttonAreaHeight: number;
    paddingConfig: {
      bottom: number;
      spacerHeight: number;
    };
  };
}

export function useAuthScreenLayout({
  screenType,
  currentStep = 1,
  keyboardVisible,
  keyboardHeight,
}: UseAuthScreenLayoutOptions): UseAuthScreenLayoutReturn {
  
  const validation = useValidationErrors();
  
  // Determinar si hay errores basado en el tipo de screen y step actual
  const hasErrors = () => {
    switch (screenType) {
      case 'signUp':
        if (currentStep === 1) return validation.hasStep1Errors();
        if (currentStep === 3) return validation.hasStep3Errors();
        return false;
      case 'signIn':
        return validation.hasStep1Errors(); // SignIn usa validación similar a Step 1
      default:
        return false;
    }
  };

  const layout = useResponsiveLayout({
    currentStep: screenType === 'signUp' ? currentStep : 1,
    keyboardVisible,
    keyboardHeight,
    hasErrors: hasErrors(),
  });

  // Configuración específica por tipo de screen
  const screenConfig = {
    showProgressBar: screenType === 'signUp',
    showSteps: screenType === 'signUp',
    cardConfig: {
      height: layout.cardHeight,
      top: layout.cardTop,
      titleTop: layout.titleTop,
    },
    buttonAreaHeight: layout.spacingConfig.buttonAreaHeight,
    paddingConfig: {
      bottom: layout.spacingConfig.paddingBottom,
      spacerHeight: layout.spacingConfig.bottomSpacerHeight,
    },
  };

  return {
    layout,
    validation,
    screenConfig,
  };
}

export default useAuthScreenLayout;