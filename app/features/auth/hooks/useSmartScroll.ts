import React from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';

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
  const { height } = useWindowDimensions();

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
        return 0; // Sin scroll para nombre
      } else if (activeInput === 'apellido') {
        // Scroll mínimo para que 'apellido' quede visible, sin ocultar otros inputs
        const inputSectionHeight = 22 + 50 + 16; // label + input + margin
  // Scroll ultra mínimo: solo la mitad del spacerOffset
  return Math.round(spacerOffset / 2);
      }
    } else if (currentStep === 2) {
      return 0; // Sin scroll para paso 2
    } else if (currentStep === 3) {
      // Paso 3: Email, contraseña, confirmar contraseña - Scroll optimizado por tamaño de pantalla
      const spacerOffset = getSpacerOffset(); // Compensar el paddingTop
      const inputSectionHeight = 22 + 50 + 16; // label + input + margin = 88px
      // Hacer el scroll para contraseña mucho más conservador: reducir multiplicador y margen
      const safetyMargin = height * (isLargeScreen ? 0.006 : 0.005);

      if (activeInput === 'email') {
        return 0; // No hacer scroll cuando el email recibe el foco
      } else if (activeInput === 'password') {
        // Scroll muy conservador para contraseña: base 0.10
        const scrollForPassword = (inputSectionHeight * 0.10) * scrollReductionFactor;
        const desired = Math.round(spacerOffset + scrollForPassword + safetyMargin);
        // Limitar el desplazamiento máximo para evitar movimientos agresivos (4% de la altura)
        const maxAllowed = Math.round(spacerOffset + height * 0.04);
        // Aplicar reducción final del 20% para atenuar movimientos
        const reducedDesired = Math.round(desired * 0.80);
        const reducedMax = Math.round(maxAllowed * 0.80);
        return Math.min(reducedDesired, reducedMax);
      }
    }
    return 0;
  }, [currentStep, activeInput, getSpacerOffset]);

  // Ejecutar scroll automático. Permite un delay opcional (ms) para esperar renders o teclado.
  const executeScroll = React.useCallback((position: number, animated: boolean = true, delay: number = 0) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ 
        y: position, 
        animated
      });
    }, delay > 0 ? delay : 400); // usar 400ms por defecto para asegurar que el teclado esté visible
  }, []);

  // Resetear scroll
  const resetScroll = React.useCallback((animated: boolean = true) => {
    // Si estamos en Step 1 y el teclado NO está visible, quedarse en 0 para evitar saltos
    let resetPosition = 0;
    if (!(currentStep === 1 && !keyboardVisible)) {
      resetPosition = (currentStep === 1 || currentStep === 3) ? getSpacerOffset() : 0;
    }
    // Ejecutar sin delay por defecto para evitar movimientos inesperados
    executeScroll(resetPosition, animated, 0);
  }, [currentStep, getSpacerOffset, executeScroll, keyboardVisible]);

  // Efecto principal de scroll automático
  React.useEffect(() => {
    if (keyboardVisible && activeInput) {
      const scrollY = getScrollPosition();
      // Esperar más tiempo a que el teclado aparezca y el layout se estabilice
      executeScroll(scrollY, true, 350);
    } else if (!keyboardVisible) {
      // Resetear inmediatamente en ausencia de teclado
      resetScroll(false);
    }
  }, [keyboardVisible, activeInput, currentStep, getScrollPosition, executeScroll, resetScroll]);

  const resetScrollImmediate = React.useCallback(() => {
    const resetPosition = (currentStep === 1 && !keyboardVisible) ? 0 : ((currentStep === 1 || currentStep === 3) ? getSpacerOffset() : 0);
    try {
      scrollViewRef.current?.scrollTo({ y: resetPosition, animated: false });
    } catch (e) {
      // noop
    }
  }, [currentStep, getSpacerOffset, keyboardVisible]);

  return {
    scrollViewRef,
    resetScroll,
    resetScrollImmediate,
    getSpacerOffset,
    getScrollPosition,
  };
}