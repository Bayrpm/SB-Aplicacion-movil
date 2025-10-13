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
    const isLargeScreen = height > 812;
    // Espaciador reducido en Step 3 para pantallas grandes
    if (currentStep === 3 && isLargeScreen) {
      return Math.round(height * 0.12); // 12% para Step 3 en large - más espacio para inputs
    }
    return Math.round(height * 0.18); // 18% estándar
  }, [currentStep]);

  // Calcular posición de scroll óptima
  const getScrollPosition = React.useCallback(() => {
    const spacerOffset = getSpacerOffset();
    
    // Factor de reducción de scroll para pantallas grandes
    const isLargeScreen = height > 812; // S22 Ultra, iPhone Plus, etc.
    const scrollReductionFactor = isLargeScreen ? 0.7 : 1.0; // Menos scroll en pantallas grandes

    if (currentStep === 1) {
      // Paso 1: Nombre y Apellido
      if (activeInput === 'nombre') {
        return spacerOffset; // Posición natural del contenido
      } else if (activeInput === 'apellido') {
        // Cálculo preciso para ocultar solo el input nombre
        const inputSectionHeight = 22 + 50 + 16; // label + input + margin
        const calculatedScroll = (inputSectionHeight + 10) * scrollReductionFactor; // Aplicar reducción
        const safetyMargin = height * 0.01; // Reducido para pantallas grandes
        
        return Math.round(spacerOffset + calculatedScroll + safetyMargin);
      }
    } else if (currentStep === 2) {
      return 0; // Sin scroll para paso 2
    } else if (currentStep === 3) {
      // Paso 3: Email, contraseña, confirmar contraseña - Scroll optimizado por tamaño de pantalla
      const spacerOffset = getSpacerOffset(); // Compensar el paddingTop
      const inputSectionHeight = 22 + 50 + 16; // label + input + margin = 88px
      const safetyMargin = height * (isLargeScreen ? 0.01 : 0.015); // Menos margen en pantallas grandes
      
      if (activeInput === 'email') {
        return spacerOffset; // Posición natural del contenido
      } else if (activeInput === 'password') {
        // Scroll moderado, más conservador en pantallas grandes
        const scrollForPassword = (inputSectionHeight * 0.6) * scrollReductionFactor;
        return Math.round(spacerOffset + scrollForPassword + safetyMargin);
      } else if (activeInput === 'confirmPassword') {
        // Scroll más agresivo para confirmar contraseña, especialmente en large
        const baseScroll = isLargeScreen ? 2.2 : 1.8; // Más scroll para mostrar input completo
        const scrollForConfirm = (inputSectionHeight * baseScroll) * scrollReductionFactor;
        const extraMargin = height * 0.02; // Margen adicional para el teclado
        return Math.round(spacerOffset + scrollForConfirm + extraMargin);
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