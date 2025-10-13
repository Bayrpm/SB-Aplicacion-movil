import React from 'react';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Tipos de dispositivos basados en dimensiones
type DeviceType = 'phone-small' | 'phone-normal' | 'phone-large' | 'tablet';

interface ResponsiveLayoutOptions {
  currentStep: number;
  keyboardVisible: boolean;
  keyboardHeight: number;
  hasErrors?: boolean;
}

interface ResponsiveLayoutReturn {
  deviceType: DeviceType;
  cardHeight: number;
  cardTop: number;
  titleTop?: number;
  safetyMargins: {
    top: number;
    bottom: number;
    sides: number;
  };
  spacingConfig: {
    titleSpace: number;
    buttonAreaHeight: number;
    paddingBottom: number;
    bottomSpacerHeight: number;
  };
}

export function useResponsiveLayout({
  currentStep,
  keyboardVisible,
  keyboardHeight,
  hasErrors = false,
}: ResponsiveLayoutOptions): ResponsiveLayoutReturn {
  // v1.9 - Posicionamiento centrado inteligente para Step 3: título visible, inputs completos, sin tocar parte inferior
  
  // Determinar tipo de dispositivo
  const deviceType = React.useMemo((): DeviceType => {
    const aspectRatio = height / width;
    
    if (width >= 768) return 'tablet'; // iPads y tablets
    if (height <= 667) return 'phone-small'; // iPhone SE, 8, etc.
    if (height <= 812) return 'phone-normal'; // iPhone X, 11, 12, 13
    return 'phone-large'; // iPhone Plus, Max, etc.
  }, []);

  // Configuración base por tipo de dispositivo
  const baseConfig = React.useMemo(() => {
    switch (deviceType) {
      case 'phone-small':
        return {
          titleSpaceRatio: hasErrors ? 0.10 : 0.12,
          maxCardHeight: hasErrors ? 0.75 : 0.65,
          minCardHeight: hasErrors ? 0.50 : 0.40,
          buttonAreaHeight: 220,
          safetyMarginRatio: hasErrors ? 0.04 : 0.06,
          titleTopRatio: hasErrors ? 0.02 : 0.04,
        };
      
      case 'phone-normal':
        return {
          titleSpaceRatio: hasErrors ? 0.12 : 0.15,
          maxCardHeight: hasErrors ? 0.65 : 0.55, // Reducido para más margen
          minCardHeight: hasErrors ? 0.45 : 0.35,
          buttonAreaHeight: 240,
          safetyMarginRatio: hasErrors ? 0.07 : 0.09, // Aumentado el margen de seguridad
          titleTopRatio: hasErrors ? 0.03 : 0.05,
        };
      
      case 'phone-large':
        return {
          titleSpaceRatio: hasErrors ? 0.14 : 0.17,
          maxCardHeight: hasErrors ? 0.72 : 0.62, // Aumentado más para garantizar espacio en Step 3
          minCardHeight: hasErrors ? 0.52 : 0.42,
          buttonAreaHeight: 260,
          safetyMarginRatio: hasErrors ? 0.08 : 0.09, // Reducido ligeramente para más espacio
          titleTopRatio: hasErrors ? 0.04 : 0.06,
        };
      
      case 'tablet':
        return {
          titleSpaceRatio: hasErrors ? 0.08 : 0.10,
          maxCardHeight: hasErrors ? 0.60 : 0.50,
          minCardHeight: hasErrors ? 0.35 : 0.25,
          buttonAreaHeight: 280,
          safetyMarginRatio: hasErrors ? 0.08 : 0.10,
          titleTopRatio: hasErrors ? 0.02 : 0.03,
        };
    }
  }, [deviceType, hasErrors]);

  // Configuración específica por step - Dinámico basado en espacio disponible
  const stepConfig = React.useMemo(() => {
    // Calcular espacio disponible real
    const titleSpace = height * baseConfig.titleSpaceRatio;
    const buttonAreaHeight = baseConfig.buttonAreaHeight;
    const availableSpace = height - titleSpace - buttonAreaHeight;
    
    // Márgenes mínimos seguros - más conservadores para mejor balance
    const minTopMargin = currentStep === 3 ? 30 : 40; // Margen más pequeño para Step 3 
    const minBottomMargin = currentStep === 3 ? 15 : 10; // Más margen para Step 3
    
    // Calcular topOffset dinámico balanceando título y parte inferior
    const calculateBalancedTopOffset = (preferredRatio: number, step: number) => {
      const preferredPixels = preferredRatio * height;
      const minTopPixels = titleSpace + minTopMargin;
      
      // Para Step 3, calcular posición óptima balanceando todos los requisitos
      if (step === 3) {
        const estimatedCardHeight = height * (hasErrors ? 1.3 : 1.2) * baseConfig.maxCardHeight; // Altura más realista
        const maxBottomPosition = height - buttonAreaHeight - minBottomMargin;
        const maxAllowedTop = maxBottomPosition - estimatedCardHeight;
        
        // Calcular posición centrada en el espacio disponible
        const totalAvailableSpace = maxBottomPosition - minTopPixels;
        const centeredPosition = minTopPixels + (totalAvailableSpace - estimatedCardHeight) / 2;
        
        // Usar la posición que mejor balance los tres requisitos
        const balancedTop = Math.max(
          minTopPixels, // No tapar título (mínimo)
          Math.min(
            centeredPosition, // Posición centrada preferida
            maxAllowedTop // No tapar parte inferior (máximo)
          )
        );
        
        return balancedTop / height;
      }
      
      // Para Steps 1 y 2, lógica normal
      const finalTopPixels = Math.max(minTopPixels, preferredPixels);
      return finalTopPixels / height;
    };
    
    switch (currentStep) {
      case 1:
        return {
          heightMultiplier: hasErrors ? 1.15 : 1.0,
          topOffset: calculateBalancedTopOffset(hasErrors ? 0.20 : 0.22, 1), // Dinámico con preferencia
          extraPadding: hasErrors ? 20 : 0,
        };
      
      case 2:
        return {
          heightMultiplier: 0.8, // Step 2 es más compacto
          topOffset: calculateBalancedTopOffset(0.21, 2), // Dinámico
          extraPadding: 0,
        };
      
      case 3:
        return {
          heightMultiplier: hasErrors ? 1.3 : 1.2, // Altura más realista
          topOffset: calculateBalancedTopOffset(hasErrors ? 0.18 : 0.16, 3), // Posición más centrada
          extraPadding: hasErrors ? 25 : 15,
        };
      
      default:
        return {
          heightMultiplier: 1.0,
          topOffset: calculateBalancedTopOffset(0.15, 0),
          extraPadding: 0,
        };
    }
  }, [currentStep, hasErrors, baseConfig, height]);

  // Calcular altura de la card
  const cardHeight = React.useMemo(() => {
    const config = baseConfig;
    const step = stepConfig;
    
    // Espacio usado por otros elementos
    const titleSpace = height * config.titleSpaceRatio;
    const buttonAreaHeight = config.buttonAreaHeight;
    const safetyMargin = height * config.safetyMarginRatio;
    
    // Margen mínimo garantizado - más flexible para Step 3
    const minSafetyMarginPixels = currentStep === 3 ? 45 : 60; // Menos margen para Step 3
    const finalSafetyMargin = Math.max(safetyMargin, minSafetyMarginPixels);
    
    // Ajuste por teclado
    const keyboardAdjustment = keyboardVisible ? keyboardHeight : 0;
    
    // Espacio disponible para la card (con margen garantizado)
    const availableSpace = height - titleSpace - buttonAreaHeight - finalSafetyMargin - keyboardAdjustment;
    const availableRatio = availableSpace / height;
    
    // Aplicar multiplicador del step, con ajuste especial para Step 3 en dispositivos large
    let targetHeight = availableRatio * step.heightMultiplier;
    
    // Factor de seguridad variable según step y dispositivo
    let safetyFactor = 0.95;
    
    // Para Step 3, ser mucho menos conservador para mostrar los 3 inputs
    if (currentStep === 3) {
      safetyFactor = deviceType === 'phone-large' ? 0.99 : 0.97; // Usar casi todo el espacio disponible
    }
    
    // Aplicar factor de seguridad
    targetHeight = targetHeight * safetyFactor;
    
    // Limitar entre mínimo y máximo
    targetHeight = Math.max(config.minCardHeight, Math.min(config.maxCardHeight, targetHeight));
    
    // Verificación simplificada: Solo para casos extremos
    // Para Step 3, ser más permisivo ya que necesita mostrar 3 inputs
    if (currentStep === 3) {
      // Step 3: Permitir usar más espacio, la verificación se hará en cardTop
      targetHeight = Math.min(config.maxCardHeight, targetHeight);
    } else {
      // Steps 1 y 2: Verificación menos restrictiva ahora que están más abajo
      const minTopMargin = 30;
      const minCardTop = (titleSpace + minTopMargin + (step.topOffset * height)) / height;
      const maxAllowedHeight = (height - (minCardTop * height) - buttonAreaHeight - finalSafetyMargin) / height;
      
      // Ser menos restrictivo ya que están posicionados más abajo
      if (targetHeight > maxAllowedHeight) {
        targetHeight = Math.max(config.minCardHeight, maxAllowedHeight * 0.98); // 98% vs 95% anterior
      }
    }
    
    return targetHeight;
  }, [baseConfig, stepConfig, keyboardVisible, keyboardHeight]);

  // Calcular posición top de la card
  const cardTop = React.useMemo(() => {
    const config = baseConfig;
    const step = stepConfig;
    
    const titleSpace = height * config.titleSpaceRatio;
    const cardHeightPixels = cardHeight * height;
    const buttonAreaHeight = config.buttonAreaHeight;
    const safetyMargin = height * config.safetyMarginRatio;
    
    // Margen mínimo garantizado (nunca menos de 60px)
    const minSafetyMarginPixels = 60;
    const finalSafetyMargin = Math.max(safetyMargin, minSafetyMarginPixels);
    
    // Posición mínima (después del título) - más espacio para Steps 1 y 2
    const minTopMargin = (currentStep === 1 || currentStep === 2) ? 30 : 20;
    const minTop = (titleSpace + minTopMargin) / height;
    
    // Posición máxima (que no se oculte con botones) con margen garantizado
    const maxTop = (height - cardHeightPixels - buttonAreaHeight - finalSafetyMargin) / height;
    
    // Aplicar offset del step - posición deseada
    const targetTop = step.topOffset; // Usar directamente el topOffset sin sumar minTop
    
    // Verificación flexible según el step
    let finalTop = targetTop;
    
    // Para Steps 1 y 2, respetar el topOffset configurado pero verificar margen con errores
    if (currentStep === 1 || currentStep === 2) {
      finalTop = targetTop; // Usar directamente el topOffset configurado
      
      // Si hay errores, verificar que haya margen mínimo de 10px con la parte inferior
      if (hasErrors) {
        const cardBottomPosition = finalTop * height + cardHeightPixels;
        const minBottomMargin = 10; // Margen mínimo de 10px
        const maxAllowedBottom = height - buttonAreaHeight - minBottomMargin;
        
        // Solo ajustar si realmente se superpone
        if (cardBottomPosition > maxAllowedBottom) {
          finalTop = (maxAllowedBottom - cardHeightPixels) / height;
        }
      }
    } else {
      // Step 3: Usar directamente el topOffset calculado dinámicamente (ya incluye margen mínimo)
      finalTop = targetTop;
      
      // Solo verificar margen inferior, no reposicionar hacia arriba  
      const cardBottomPosition = finalTop * height + cardHeightPixels;
      const minBottomMargin = 15; // Margen mínimo de 15px para Step 3
      const maxAllowedBottom = height - buttonAreaHeight - minBottomMargin;
      
      // Solo si realmente no cabe, ajustar la altura de la card, no la posición
      if (cardBottomPosition > maxAllowedBottom) {
        // En lugar de mover la card, podríamos considerar reducir su altura si es necesario
        // Pero por ahora mantenemos la posición calculada dinámicamente
        console.warn('Step 3 card might exceed bottom margin, but maintaining position for title visibility');
      }
    }
    
    return finalTop;
  }, [baseConfig, stepConfig, cardHeight]);

  // Calcular posición del título de forma inteligente
  const titleTop = React.useMemo(() => {
    const config = baseConfig;
    // Calcular posición del título respetando el espacio de la card
    const cardTopPosition = stepConfig.topOffset;
    const minTitleCardGap = 0.03; // 3% mínimo entre título y card
    
    // El título debe estar al menos 3% por encima de la card
    const maxTitleTop = cardTopPosition - minTitleCardGap;
    
    // Usar la menor posición entre la configurada y la calculada
    return Math.min(config.titleTopRatio, maxTitleTop);
  }, [baseConfig, stepConfig]);

  // Configuración de márgenes de seguridad
  const safetyMargins = React.useMemo(() => {
    const baseMargin = height * baseConfig.safetyMarginRatio;
    
    return {
      top: baseMargin,
      bottom: baseMargin + stepConfig.extraPadding,
      sides: width * 0.04, // 4% de los lados
    };
  }, [baseConfig, stepConfig]);

  // Configuración de espaciado
  const spacingConfig = React.useMemo(() => {
    const config = baseConfig;
    
    return {
      titleSpace: height * config.titleSpaceRatio,
      buttonAreaHeight: config.buttonAreaHeight,
      paddingBottom: keyboardVisible ? 
        (currentStep === 3 ? (hasErrors ? 40 : 25) : (hasErrors ? 30 : 20)) :
        (currentStep === 3 ? (hasErrors ? 55 : 35) : (hasErrors ? 50 : 40)),
      bottomSpacerHeight: currentStep === 3 ? 
        (hasErrors ? 40 : 25) : 
        (hasErrors ? 50 : 40),
    };
  }, [baseConfig, keyboardVisible, currentStep, hasErrors]);

  return {
    deviceType,
    cardHeight,
    cardTop,
    titleTop,
    safetyMargins,
    spacingConfig,
  };
}