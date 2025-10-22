import React from 'react';
import { useWindowDimensions } from 'react-native';

// Usaremos categorías Material basadas en width/height (compact/medium/expanded)

interface ResponsiveLayoutOptions {
  currentStep: number;
  keyboardVisible: boolean;
  keyboardHeight: number;
  hasErrors?: boolean;
}

interface ResponsiveLayoutReturn {
  // Material size categories
  widthCategory: 'compact' | 'medium' | 'expanded';
  heightCategory: 'compact' | 'medium' | 'expanded';
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
  // Helpers added for consistent sizing across the app
  fontSize: (base: number) => number;
  // Scaling helpers (based on a guideline reference size) so UI looks consistent
  // across devices regardless of resolution.
  scale: (size: number) => number;
  verticalScale: (size: number) => number;
  moderateScale: (size: number, factor?: number) => number;
  spacing: (percent: number) => number;
  buttonSize: (base: number) => number;
  iconRatio: number; // ratio for icon size inside button
  clamp: (value: number, min: number, max: number) => number;
  getBackTranslate: (svgHeight: number) => number;
  // Current fontScale reported by the OS (from useWindowDimensions)
  fontScale: number;
  // Diagonal in dp (useful for debug/tuning)
  diagonalDp: number;
}

export function useResponsiveLayout({
  currentStep,
  keyboardVisible,
  keyboardHeight,
  hasErrors = false,
}: ResponsiveLayoutOptions): ResponsiveLayoutReturn {
  // Hook responsivo: obtiene ancho, alto y factores en tiempo real
  const { width, height, fontScale } = useWindowDimensions();


  // compute diagonal in dp (useWindowDimensions already gives logical pixels)
  const diagonalDp = React.useMemo(() => Math.sqrt(width * width + height * height), [width, height]);

  // Configuración base por categoría de ancho (Material)
  const baseConfig = React.useMemo(() => {
    // widthCategory será calculado más abajo; usamos inline thresholds aquí
    if (width < 600) {
      // compact (phones small/normal)
      return {
        titleSpaceRatio: hasErrors ? 0.12 : 0.14,
        maxCardHeight: hasErrors ? 0.70 : 0.60,
        minCardHeight: hasErrors ? 0.45 : 0.35,
        buttonAreaHeight: Math.max(48, height * 0.12),
        safetyMarginRatio: hasErrors ? 0.06 : 0.08,
        titleTopRatio: hasErrors ? 0.03 : 0.05,
      };
    }
    if (width >= 600 && width < 840) {
      // medium (large phones / small tablets)
      return {
        titleSpaceRatio: hasErrors ? 0.13 : 0.16,
        maxCardHeight: hasErrors ? 0.72 : 0.62,
        minCardHeight: hasErrors ? 0.50 : 0.40,
        buttonAreaHeight: Math.max(52, height * 0.13),
        safetyMarginRatio: hasErrors ? 0.07 : 0.09,
        titleTopRatio: hasErrors ? 0.04 : 0.06,
      };
    }
    // expanded (tablets)
    return {
      titleSpaceRatio: hasErrors ? 0.08 : 0.10,
      maxCardHeight: hasErrors ? 0.60 : 0.50,
      minCardHeight: hasErrors ? 0.35 : 0.25,
      buttonAreaHeight: Math.max(60, height * 0.11),
      safetyMarginRatio: hasErrors ? 0.08 : 0.10,
      titleTopRatio: hasErrors ? 0.02 : 0.03,
    };
  }, [width, hasErrors, height]);

  // Configuración específica por step - Dinámico basado en espacio disponible
  const stepConfig = React.useMemo(() => {
    const titleSpace = height * baseConfig.titleSpaceRatio;
    const buttonAreaHeight = baseConfig.buttonAreaHeight;
    const minTopMargin = currentStep === 3 ? 30 : 40;
    const minBottomMargin = currentStep === 3 ? 15 : 10;

    const calculateBalancedTopOffset = (preferredRatio: number, step: number) => {
      const preferredPixels = preferredRatio * height;
      const minTopPixels = titleSpace + minTopMargin;

      if (step === 3) {
        const estimatedCardHeight = height * (hasErrors ? 1.3 : 1.2) * baseConfig.maxCardHeight;
        const maxBottomPosition = height - buttonAreaHeight - minBottomMargin;
        const maxAllowedTop = maxBottomPosition - estimatedCardHeight;
        const totalAvailableSpace = maxBottomPosition - minTopPixels;
        const centeredPosition = minTopPixels + (totalAvailableSpace - estimatedCardHeight) / 2;
        const balancedTop = Math.max(
          minTopPixels,
          Math.min(centeredPosition, maxAllowedTop)
        );
        return balancedTop / height;
      }
      const finalTopPixels = Math.max(minTopPixels, preferredPixels);
      return finalTopPixels / height;
    };

    switch (currentStep) {
      case 1:
        return {
          heightMultiplier: hasErrors ? 1.15 : 1.0,
          topOffset: calculateBalancedTopOffset(hasErrors ? 0.20 : 0.22, 1),
          extraPadding: hasErrors ? 20 : 0,
        };
      case 2:
        return {
          heightMultiplier: 0.8,
          topOffset: calculateBalancedTopOffset(0.21, 2),
          extraPadding: 0,
        };
      case 3:
        return {
          heightMultiplier: hasErrors ? 1.3 : 1.2,
          topOffset: calculateBalancedTopOffset(hasErrors ? 0.18 : 0.16, 3),
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
    const titleSpace = height * config.titleSpaceRatio;
    const buttonAreaHeight = config.buttonAreaHeight;
    const safetyMargin = height * config.safetyMarginRatio;
    const minSafetyMarginPixels = currentStep === 3 ? 45 : 60;
    const finalSafetyMargin = Math.max(safetyMargin, minSafetyMarginPixels);
    const keyboardAdjustment = keyboardVisible ? keyboardHeight : 0;
    const availableSpace = height - titleSpace - buttonAreaHeight - finalSafetyMargin - keyboardAdjustment;
    const availableRatio = availableSpace / height;
    let targetHeight = availableRatio * step.heightMultiplier;
    let safetyFactor = 0.95;
    if (currentStep === 3) {
      safetyFactor = width >= 600 ? 0.99 : 0.97;
    }
    targetHeight = targetHeight * safetyFactor;
    targetHeight = Math.max(config.minCardHeight, Math.min(config.maxCardHeight, targetHeight));
    if (currentStep === 3) {
      targetHeight = Math.min(config.maxCardHeight, targetHeight);
    } else {
      const minTopMargin = 30;
      const minCardTop = (titleSpace + minTopMargin + (step.topOffset * height)) / height;
      const maxAllowedHeight = (height - (minCardTop * height) - buttonAreaHeight - finalSafetyMargin) / height;
      if (targetHeight > maxAllowedHeight) {
        targetHeight = Math.max(config.minCardHeight, maxAllowedHeight * 0.98);
      }
    }
    return targetHeight;
  }, [baseConfig, stepConfig, keyboardVisible, keyboardHeight, currentStep, height]);

  // Calcular posición top de la card
  const cardTop = React.useMemo(() => {
    const config = baseConfig;
    const step = stepConfig;
    const titleSpace = height * config.titleSpaceRatio;
    const cardHeightPixels = cardHeight * height;
    const buttonAreaHeight = config.buttonAreaHeight;
    const safetyMargin = height * config.safetyMarginRatio;
    const minSafetyMarginPixels = 60;
    const finalSafetyMargin = Math.max(safetyMargin, minSafetyMarginPixels);
    const minTopMargin = (currentStep === 1 || currentStep === 2) ? 30 : 20;
    const minTop = (titleSpace + minTopMargin) / height;
    const maxTop = (height - cardHeightPixels - buttonAreaHeight - finalSafetyMargin) / height;
    const targetTop = step.topOffset;
    let finalTop = targetTop;
    if (currentStep === 1 || currentStep === 2) {
      finalTop = targetTop;
      if (hasErrors) {
        const cardBottomPosition = finalTop * height + cardHeightPixels;
        const minBottomMargin = 10;
        const maxAllowedBottom = height - buttonAreaHeight - minBottomMargin;
        if (cardBottomPosition > maxAllowedBottom) {
          finalTop = (maxAllowedBottom - cardHeightPixels) / height;
        }
      }
    } else {
      finalTop = targetTop;
      const cardBottomPosition = finalTop * height + cardHeightPixels;
      const minBottomMargin = 15;
      const maxAllowedBottom = height - buttonAreaHeight - minBottomMargin;
      if (cardBottomPosition > maxAllowedBottom) {
        // Se puede ajustar la altura si es necesario, pero mantenemos la posición calculada
      }
    }
    return finalTop;
  }, [baseConfig, stepConfig, cardHeight, currentStep, hasErrors, height]);

  // Calcular posición del título de forma inteligente
  const titleTop = React.useMemo(() => {
    const config = baseConfig;
    const cardTopPosition = stepConfig.topOffset;
    const minTitleCardGap = 0.03;
    const maxTitleTop = cardTopPosition - minTitleCardGap;
    return Math.min(config.titleTopRatio, maxTitleTop);
  }, [baseConfig, stepConfig]);

  // Reference design size (pick a common device as baseline, e.g. iPhone 12/13/14 ~390x844)
  const GUIDELINE_BASE_WIDTH = 390;
  const GUIDELINE_BASE_HEIGHT = 844;

  // Scaling helpers: use layout pixels (useWindowDimensions) to compute scaled sizes
  const scale = React.useCallback((size: number) => {
    return Math.round((width / GUIDELINE_BASE_WIDTH) * size);
  }, [width]);

  const verticalScale = React.useCallback((size: number) => {
    return Math.round((height / GUIDELINE_BASE_HEIGHT) * size);
  }, [height]);

  const moderateScale = React.useCallback((size: number, factor = 0.5) => {
    const scaled = scale(size);
    return Math.round(size + (scaled - size) * factor);
  }, [scale]);

  // Configuración de márgenes de seguridad
  const safetyMargins = React.useMemo(() => {
    const baseMargin = height * baseConfig.safetyMarginRatio;
    return {
      top: baseMargin,
      bottom: baseMargin + stepConfig.extraPadding,
      sides: Math.max(12, width * 0.04),
    };
  }, [baseConfig, stepConfig, width, height]);

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
  }, [baseConfig, keyboardVisible, currentStep, hasErrors, height]);

  // Helpers: fontSize, spacing (px), buttonSize, icon ratio, clamp, back translate
  const clamp = React.useCallback((value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
  }, []);

  const fontSize = React.useCallback((base: number) => {
    // Use moderateScale to make typography look consistent across sizes.
    const scaled = moderateScale(base, 0.55);
    // Boost a bit for tall narrow phones (compact width, expanded height)
    const extraMultiplier = (width < 600 && height >= 900) ? 1.08 : (height >= 900 ? 1.05 : 1.0);
    const adjusted = Math.round(scaled * extraMultiplier);
    // Clamp to avoid extreme jumps
    const result = clamp(adjusted, Math.round(base * 0.95), Math.round(base * 1.95));
    // Apply global +5% increase requested
    return Math.round(result * 1.05);
  }, [moderateScale, clamp, width, height]);

  const spacing = React.useCallback((percent: number) => Math.round(width * (percent / 100)), [width]);

  const iconRatio = React.useMemo(() => {
    if (width >= 840) return 0.36;
    if (width >= 600) return 0.42;
    return 0.44;
  }, [width]);

  const buttonSize = React.useCallback((base: number) => {
    // Conservative baseline for button sizes to keep layout reasonable
    const pct = width >= 840 ? 0.12 : width >= 600 ? 0.11 : 0.095;
    const fromWidth = Math.round(width * pct);
    const baseScaled = scale(base);
    const rawCandidate = Math.round(Math.max(baseScaled, fromWidth));
    const rawBase = moderateScale(rawCandidate, width >= 840 ? 0.8 : width >= 600 ? 0.7 : 0.6);
    // Increase buttons a bit on tall narrow phones so they are easier to tap/see
    const extra = (width < 600 && height >= 900) ? 1.12 : (height >= 900 ? 1.08 : 1.0);
    const raw = Math.round(rawBase * extra);
    const upperClamp = Math.round(Math.max(base * 2.0, fromWidth * 1.25) * extra);
    const result = clamp(raw, Math.round(base * 0.95), upperClamp);
    // Apply global +10% increase requested for buttons
    return Math.round(result * 1.10);
  }, [width, clamp, scale, moderateScale, height]);

  const getBackTranslate = React.useCallback((svgHeight: number) => {
    if (width >= 840) return -Math.round(height * 0.04);
    if (width >= 600) return -Math.round(height * 0.02);
    return Math.round(svgHeight * 0.12 + height * 0.015);
  }, [width, height]);

  // Material size categories (width & height) using the official Android/Material thresholds
  const widthCategory = React.useMemo(() => {
    if (width < 600) return 'compact';
    if (width >= 600 && width < 840) return 'medium';
    return 'expanded';
  }, [width]);

  const heightCategory = React.useMemo(() => {
    if (height < 480) return 'compact';
    if (height >= 480 && height < 900) return 'medium';
    return 'expanded';
  }, [height]);

  return {
    cardHeight,
    widthCategory,
    heightCategory,
    cardTop,
    titleTop,
    safetyMargins,
    spacingConfig,
    fontSize,
    // expose scaling helpers so callers can use consistent scaling rules
    scale,
    verticalScale,
    moderateScale,
    // expose runtime fontScale and diagonal for debugging/tuning
    fontScale,
    diagonalDp: Math.sqrt(width * width + height * height),
    spacing,
    buttonSize,
    iconRatio,
    clamp,
    getBackTranslate,
  };
}

export default useResponsiveLayout;