import React from 'react';
import { Dimensions, ScrollView } from 'react-native';

const { height } = Dimensions.get('window');

interface UseSmartScrollOptions {
  currentStep: number;
  keyboardVisible: boolean;
  activeInput: string | null;
  getCardHeight: () => number;
}

export function useSmartScroll({
  currentStep,
  keyboardVisible,
  activeInput,
  getCardHeight
}: UseSmartScrollOptions) {
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Calcular espaciador superior proporcional
  const getSpacerOffset = React.useCallback(() => {
    return Math.round(height * 0.18); // 18% de la altura de pantalla
  }, []);

  // Calcular posición de scroll óptima
  const getScrollPosition = React.useCallback(() => {
    const spacerOffset = getSpacerOffset();

    if (currentStep === 1) {
      // Paso 1: Nombre y Apellido
      if (activeInput === 'nombre') {
        return spacerOffset; // Posición natural del contenido
      } else if (activeInput === 'apellido') {
        // Cálculo preciso para ocultar solo el input nombre
        const inputSectionHeight = 22 + 50 + 16; // label + input + margin
        const calculatedScroll = inputSectionHeight + 10; // margen mínimo
        const safetyMargin = height * 0.015; // 1.5% de pantalla
        
        return Math.round(spacerOffset + calculatedScroll + safetyMargin);
      }
    } else if (currentStep === 2) {
      return 0; // Sin scroll para paso 2
    } else if (currentStep === 3) {
      // Paso 3: Email, contraseña, confirmar contraseña - Scroll mejorado con espaciador
      const spacerOffset = getSpacerOffset(); // Compensar el paddingTop
      const inputSectionHeight = 22 + 50 + 16; // label + input + margin = 88px
      const safetyMargin = height * 0.015; // 1.5% de pantalla como margen
      
      if (activeInput === 'email') {
        return spacerOffset; // Posición natural del contenido
      } else if (activeInput === 'password') {
        // Scroll moderado para mostrar password sin ocultar su contenido
        const scrollForPassword = inputSectionHeight * 0.8; // Scroll más conservador
        return Math.round(spacerOffset + scrollForPassword + safetyMargin);
      } else if (activeInput === 'confirmPassword') {
        // Scroll mínimo absoluto para confirmar contraseña
        const scrollForConfirm = (inputSectionHeight * 1.5); // Solo 1.5 inputs de scroll
        return Math.round(spacerOffset + scrollForConfirm); // Sin margen adicional
      }
    }
    return 0;
  }, [currentStep, activeInput, getSpacerOffset]);

  // Ejecutar scroll automático
  const executeScroll = React.useCallback((position: number, animated: boolean = true) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ 
        y: position, 
        animated 
      });
    }, 200);
  }, []);

  // Resetear scroll
  const resetScroll = React.useCallback((animated: boolean = true) => {
    const resetPosition = (currentStep === 1 || currentStep === 3) ? getSpacerOffset() : 0;
    if (animated) {
      executeScroll(resetPosition);
    } else {
      // Scroll inmediato sin animación para evitar efectos raros al cambiar de step
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ 
          y: resetPosition, 
          animated: false 
        });
      }, 50);
    }
  }, [currentStep, getSpacerOffset, executeScroll]);

  // Efecto principal de scroll automático
  React.useEffect(() => {
    if (keyboardVisible && activeInput) {
      const scrollY = getScrollPosition();
      executeScroll(scrollY);
    } else if (!keyboardVisible) {
      resetScroll();
    }
  }, [keyboardVisible, activeInput, currentStep, getScrollPosition, executeScroll, resetScroll]);

  return {
    scrollViewRef,
    resetScroll,
    resetScrollImmediate: () => resetScroll(false),
    getSpacerOffset,
  };
}