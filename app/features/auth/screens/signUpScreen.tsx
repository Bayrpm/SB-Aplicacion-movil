import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import BaseAuthLayout from '../components/BaseAuthLayout';
import { RegistrationStep1 } from '../components/RegistrationStep1';
import { RegistrationStep2 } from '../components/RegistrationStep2';
import { RegistrationStep3 } from '../components/RegistrationStep3';
import { useActiveInput } from '../hooks/useActiveInput';
import { useRegistration } from '../hooks/useRegistration';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useSmartScroll } from '../hooks/useSmartScroll';
import { useValidationErrors } from '../hooks/useValidationErrors';

const TOTAL_STEPS = 3;

export default function SignUpScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const {
    currentStep,
    loading,
    saveStep1Data,
    saveStep2Data,
    saveStep3Data,
    skipStep2,
    goBack,
    cancelRegistration,
    registrationData,
    getStep1Data,
    getStep2Data,
    getStep3Data,
  } = useRegistration();

  React.useEffect(() => {
    if (currentStep !== 1) {
      cancelRegistration();
    }
  }, []);

  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e: any) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidHideListener?.remove();
      keyboardDidShowListener?.remove();
    };
  }, []);

  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const progressAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 0.95,
      duration: 80,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    });
  }, [currentStep]);

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStep,
      duration: 300,
      useNativeDriver: false,
    }).start();
    resetScrollImmediate();
  }, [currentStep]);

  const { hasStep1Errors, hasStep3Errors } = useValidationErrors();
  const currentStepHasErrors = React.useMemo(() => {
    if (currentStep === 1) return hasStep1Errors();
    if (currentStep === 3) return hasStep3Errors();
    return false;
  }, [currentStep, hasStep1Errors, hasStep3Errors]);

  const responsiveLayout = useResponsiveLayout({
    currentStep,
    keyboardVisible,
    keyboardHeight,
    hasErrors: currentStepHasErrors,
  });

  // Mostrar overlay de carga durante el registro

  const { widthCategory, heightCategory, cardHeight, cardTop, titleTop, spacingConfig } = responsiveLayout;
  // Top ratio para Step3 sensible al tamaño de pantalla: no tocará teléfonos pequeños
  const step3TopRatio = React.useMemo(() => {
    if (height < 700) return 0.04; // phones pequeños (mantener lo bueno)
    if (height < 900) return 0.07; // tablets pequeñas / phablets
    return 0.14; // pantallas más grandes: bajar la card un poco más
  }, [height]);
  // Ajuste conservador de la altura de la card en píxeles para asegurarnos
  // de que los inputs (especialmente en Step 1) se muestren completos al cargar.
  // No tocamos el scroll; en su lugar hacemos que la tarjeta sea más alta si hace falta.
  const adjustedCardHeight = React.useMemo(() => {
    try {
      const baseRatio = cardHeight;
      const basePx = Math.round(baseRatio * height);


      // Usar exactamente la misma lógica de Step1 para Step3, pero aumentar el mínimo para Step3
      const minPxStep1 = currentStepHasErrors
        ? Math.max(380, Math.round(height * 0.34))
        : Math.max(340, Math.round(height * 0.28));
        const minPxStep2 = Math.max(320, Math.round(height * 0.26));
  // Step3: aumentar ligeramente el mínimo para dar más altura
  // Ajuste: permitir desde 40% de la pantalla o 480px como mínimo conservador
  const minPxStep3 = Math.max(480, Math.round(height * 0.40));

      let requiredPx = 0;
      if (currentStep === 1) {
        requiredPx = minPxStep1;
      } else if (currentStep === 2) {
        requiredPx = minPxStep2;
      } else if (currentStep === 3) {
        requiredPx = minPxStep3;
      } else {
        requiredPx = Math.max(Math.round(height * 0.32), 540);
      }

      // SOLO Step3: altura máxima = espacio entre top 4% y bottom 8% de la pantalla
      let finalRatio = baseRatio;
      if (currentStep === 3) {
  // Make Step3 responsive: reserve top and bottom gaps and compute available space
  const reservedTopPx = Math.round(height * step3TopRatio);
  const reservedBottomPx = Math.round(height * 0.30); // 30% reserved at bottom
        const availablePx = Math.max(0, height - reservedTopPx - reservedBottomPx);
        const maxRatioFromAvailable = availablePx / height;
        const capRatio = Math.min(maxRatioFromAvailable, 0.68); // hard cap
        const minRatio = minPxStep3 / height;
        // Prefer baseRatio but clamp to [minRatio, capRatio]
        finalRatio = Math.max(minRatio, Math.min(capRatio, baseRatio));
      } else {
        if (basePx < requiredPx) {
          const requiredRatio = Math.min(0.95, requiredPx / height);
          finalRatio = Math.max(baseRatio, requiredRatio);
        }
      }
      return finalRatio;
    } catch (e) {
      return cardHeight;
    }
  }, [cardHeight, currentStep, height, currentStepHasErrors]);
  const getCardHeight = React.useCallback(() => cardHeight, [cardHeight]);
  const { activeInput } = useActiveInput();
  const {
    scrollViewRef,
    resetScroll,
    resetScrollImmediate,
    getSpacerOffset,
    getScrollPosition
  } = useSmartScroll({
    currentStep,
    keyboardVisible,
    activeInput,
    getCardHeight,
  });

  // Local loading guard to ensure overlay visible at least MIN ms
  const localLoadingRef = React.useRef<boolean>(false);
  const [localLoading, setLocalLoading] = React.useState(false);
  const localLoadingStart = React.useRef<number | null>(null);
  const localTimerRef = React.useRef<number | null>(null);
  const MIN_LOADING_MS = 900;

  const startLocalLoading = () => {
    localLoadingRef.current = true;
    localLoadingStart.current = Date.now();
    setLocalLoading(true);
  };

  const stopLocalLoading = () => {
    const started = localLoadingStart.current ?? 0;
    const elapsed = Date.now() - started;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
    if (remaining > 0) {
      // @ts-ignore
      localTimerRef.current = setTimeout(() => {
        localLoadingRef.current = false;
        setLocalLoading(false);
        localLoadingStart.current = null;
        localTimerRef.current = null;
      }, remaining) as unknown as number;
    } else {
      localLoadingRef.current = false;
      setLocalLoading(false);
      localLoadingStart.current = null;
    }
  };

  // Debug refs to inspect scroll behavior and sizes
  // Debug helpers removed after confirmation

  // Asegurar que la card nunca llegue hasta el borde inferior: calcular un cardTop ajustado
  const adjustedCardTop = React.useMemo(() => {
    try {
      const desiredRatio = cardTop; // ratio propuesto por el hook
      const desiredHeightPx = Math.round(adjustedCardHeight * height);
      const desiredTopPx = Math.round(desiredRatio * height);

      // margen mínimo en px que siempre queremos dejar entre bottom de la card y el borde inferior
      const minBottomGapPx = Math.round(height * 0.22);

      // Si la card se solapa con el borde inferior, subirla lo justo para que nunca se meta debajo
      if (desiredTopPx + desiredHeightPx > height - minBottomGapPx) {
        // Subimos el top para que la card crezca solo hacia arriba
        const newTopPx = Math.max(Math.round(height * 0.18), height - desiredHeightPx - minBottomGapPx);
        return newTopPx / height;
      }
      if (currentStep === 3) {
        // Top fijo responsivo según tamaño
        return step3TopRatio;
      }
      return desiredRatio;
    } catch (e) {
      return cardTop;
    }
  }, [cardTop, adjustedCardHeight, height, spacingConfig]);

  // Garantizar posición inicial del scroll
  const initialScrollOffset = { y: 0 };

  // Calcular paddingTop razonable para el contenido: no usar el spacer completo como padding
  const spacerOffset = React.useMemo(() => getSpacerOffset(), [getSpacerOffset]);
  const contentPaddingTop = React.useMemo(() => {
    // Limitar el paddingTop a una fracción de la altura de la card para evitar empujar inputs fuera
    const maxFromCard = Math.round(cardHeight * height * 0.06); // 6% de la card
    const computed = Math.min(spacerOffset, Math.max(10, maxFromCard));
    return computed;
  }, [spacerOffset, cardHeight, height]);

  useFocusEffect(
    React.useCallback(() => {
      fadeAnim.setValue(1);
    }, [])
  );

  // A la entrada en Step 1 sin teclado, asegurar posición inicial estable
  React.useEffect(() => {
    if (currentStep === 1 && !keyboardVisible) {
      // Reset inmediato y sin animación (evita saltos y reintentos)
      try {
        resetScrollImmediate();
      } catch (_e) {
        // noop
      }
    }
  }, [currentStep, keyboardVisible, resetScrollImmediate]);

  const ProgressBarMinimal = () => (
    <View style={styles.progressBarMinimalContainer}>
      <View style={styles.progressBarTrack}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, TOTAL_STEPS],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              })
            }
          ]}
        />
      </View>
      <View style={styles.progressBarDots}>
        {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
          <Animated.View
            key={idx}
            style={[
              styles.progressBarDot,
              {
                backgroundColor: idx < currentStep ? '#0A4A90' : '#E5E7EB',
                transform: [{
                  scale: idx + 1 === currentStep ? 1.2 : 1
                }]
              }
            ]}
          />
        ))}
      </View>
    </View>
  );

  const handleBack = () => {
    if (currentStep === 1) {
      // Animación suave antes de navegar atrás para mantener consistencia con SignIn
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 0.95,
          duration: 160,
          useNativeDriver: false,
        })
      ]).start(() => {
          router.back();
        });
    } else {
      goBack();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <RegistrationStep1 
          onNext={saveStep1Data} 
          onCancel={handleBack}
          initialData={getStep1Data()}
        />;
      case 2:
        return <RegistrationStep2 
          onNext={saveStep2Data} 
          onSkip={skipStep2} 
          onBack={goBack}
          initialData={getStep2Data()}
        />;
      case 3:
        return <RegistrationStep3 
          onNext={saveStep3Data} 
          onBack={goBack}
          initialData={getStep3Data()}
        />;
      default:
        return null;
    }
  };

  const svgHeight = keyboardVisible ? Math.round(height * 0.12) : Math.round(height * 0.26);

  const continueSize = React.useMemo(() => {
    try {
      return responsiveLayout.buttonSize ? responsiveLayout.buttonSize(80) : Math.round(width * 0.16);
    } catch (_e) {
      return Math.round(width * 0.16);
    }
  }, [responsiveLayout, width]);

  const backSize = React.useMemo(() => {
    try {
      return responsiveLayout.buttonSize ? responsiveLayout.buttonSize(50) : Math.round(width * 0.10);
    } catch (_e) {
      return Math.round(width * 0.10);
    }
  }, [responsiveLayout, width]);

  const continueIcon = React.useMemo(() => Math.round(continueSize * (responsiveLayout.iconRatio ?? 0.42)), [continueSize, responsiveLayout]);
  const backIcon = React.useMemo(() => Math.round(backSize * (responsiveLayout.iconRatio ?? 0.42)), [backSize, responsiveLayout]);

  const backTranslate = React.useMemo(() => {
    try {
      return responsiveLayout.getBackTranslate ? responsiveLayout.getBackTranslate(svgHeight) : Math.round(svgHeight * 0.12 + height * 0.015);
    } catch (e) {
      return Math.round(svgHeight * 0.12 + height * 0.015);
    }
  }, [responsiveLayout, svgHeight, height]);

  // Clamp backTranslate so the back button never moves outside the visible footer area
  const backTranslateClamped = React.useMemo(() => {
    const minTranslate = -Math.round(height * 0.02); // don't lift more than 2% of height
    // allow pushing down up to 30% of svg height as requested
    const requestedDown = Math.round(svgHeight * 0.30);
    const maxTranslate = Math.round(Math.max(svgHeight * 0.15, requestedDown)); // allow up to requestedDown
    // responsiveLayout.clamp exists
    try {
      return responsiveLayout.clamp ? responsiveLayout.clamp(backTranslate, minTranslate, maxTranslate) : Math.max(minTranslate, Math.min(backTranslate, maxTranslate));
    } catch (e) {
      return Math.max(minTranslate, Math.min(backTranslate, maxTranslate));
    }
  }, [backTranslate, responsiveLayout, height, svgHeight]);

  // Pequeño desplazamiento hacia abajo para el botón Continuar (2% de la altura), clamped
  const continueTranslate = React.useMemo(() => {
    try {
      const desired = Math.round(height * 0.02);
      const maxAllowed = Math.round(svgHeight * 0.25);
      return responsiveLayout.clamp ? responsiveLayout.clamp(desired, 0, maxAllowed) : Math.max(0, Math.min(desired, maxAllowed));
    } catch (e) {
      return Math.round(height * 0.02);
    }
  }, [height, svgHeight, responsiveLayout]);

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {currentStep === 3 ? (
          <BaseAuthLayout
            title=""
            showLogo={true}
            logoSize={widthCategory === 'compact' ? 0.72 : 0.60}
            // Forzar un top ligeramente superior para Step3 (4%) para mover la card hacia arriba
            // Reducir la altura de la card en 3% para Step3 (ajuste solicitado)
            cardHeight={Math.max(0.05, adjustedCardHeight - 0.03)}
            cardTop={step3TopRatio}
            // No usar cardBottomPx en Step3: preferimos posicionar la card por `cardTop`
            cardBottomPx={undefined}
            hideBottomBand={true}
            logoInContent={true}
            contentCentered={false}
            titleTop={titleTop}
          >
            <View style={{ width: '100%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 0 }}>
              {/* Logo y ProgressBar juntos, sin margen extra */}
              {/* El logo ya está dentro del card por logoInContent, así que solo el ProgressBar */}
              <ProgressBarMinimal />
            </View>
            <View style={[styles.formContainer, { paddingHorizontal: 22, alignItems: 'center' }]}> 
              <View style={[styles.stepContent, { width: '100%', maxWidth: 420 }]}> 
                <ScrollView
                  ref={scrollViewRef}
                  // Deshabilitar scroll manual mientras el teclado esté visible
                  scrollEnabled={!keyboardVisible}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    minHeight: '100%',
                    flexGrow: 1,
                    // Añadir padding dinámico cuando el teclado está visible para
                    // asegurar que el ScrollView sea desplazable y permitir scrollTo
                    paddingBottom: keyboardVisible ? Math.max(24, keyboardHeight + 24) : 0,
                    marginBottom: 0,
                    paddingHorizontal: 8,
                    alignItems: 'stretch',
                  }}
                  keyboardShouldPersistTaps="handled"
                  scrollEventThrottle={16}
                >
                  <RegistrationStep3 
                    onNext={saveStep3Data}
                    onBack={goBack}
                    initialData={getStep3Data()}
                    onInputFocus={() => {}}
                  />
                </ScrollView>
              </View>
            </View>
            <View style={[styles.bottomSpacer, { height: keyboardVisible ? 10 : spacingConfig.bottomSpacerHeight }]} />
          </BaseAuthLayout>
        ) : (
          <BaseAuthLayout
            title=""
            showLogo={true}
            logoSize={widthCategory === 'compact' ? 0.72 : 0.60}
            cardHeight={adjustedCardHeight}
            cardTop={adjustedCardTop}
            hideBottomBand={true}
            logoInContent={false}
            contentCentered={false}
            titleTop={titleTop}
          >
            <View style={{ width: '100%', alignItems: 'center' }}>
              <ProgressBarMinimal />
            </View>
            <View style={[styles.formContainer, { paddingHorizontal: 22, alignItems: 'center' }]}> 
              <View style={[styles.stepContent, { width: '100%', maxWidth: 420 }]}> 
                {currentStep === 1 ? (
                  <ScrollView
                    ref={scrollViewRef}
                    // Deshabilitar scroll manual mientras el teclado esté visible
                    // (cuando keyboardVisible=false, mantenemos false por diseño de Step1)
                    scrollEnabled={!keyboardVisible}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                      flexGrow: 1,
                      paddingBottom: keyboardVisible ? Math.max(24, keyboardHeight + 24) : 8,
                      paddingHorizontal: 8,
                      alignItems: 'center',
                    }}
                    keyboardShouldPersistTaps="handled"
                    scrollEventThrottle={16}
                  >
                    <RegistrationStep1 
                      onNext={saveStep1Data} 
                      onCancel={handleBack}
                      initialData={getStep1Data()}
                      onInputFocus={(inputName) => {
                        if (inputName === 'apellido') {
                          // Si el teclado ya está visible, scroll inmediato (con pequeño debounce)
                          if (keyboardVisible) {
                            setTimeout(() => {
                              try {
                                if (scrollViewRef && scrollViewRef.current && typeof getScrollPosition === 'function') {
                                  const y = getScrollPosition();
                                  // requesting scroll for apellido
                                  scrollViewRef.current.scrollTo({ y, animated: true });
                                }
                              } catch (_e) {
                                // ignore scroll errors in this best-effort attempt
                              }
                            // Si el teclado aún no está visible, programar un intento tras un delay
                            // para cubrir casos en que keyboardDidShow se dispara después del focus.
                            const fallbackTimer = setTimeout(() => {
                              try {
                                if (scrollViewRef && scrollViewRef.current && typeof getScrollPosition === 'function') {
                                  const y = getScrollPosition();
                                  // fallback requesting scroll for apellido
                                  scrollViewRef.current.scrollTo({ y, animated: true });
                                }
                              } catch (_e) {}
                            }, 360);
                            // Limpiar el timeout si más tarde el teclado aparece y se ejecuta el efecto
                            // (no hacemos seguimiento extra aquí; el timeout es de corta duración)
                            setTimeout(() => clearTimeout(fallbackTimer), 1000);
                          }, 30);
                          }
                        }
                      }}
                    />
                  </ScrollView>
                ) : (
                  <RegistrationStep2 
                    onNext={saveStep2Data} 
                    onSkip={skipStep2} 
                    onBack={goBack}
                    initialData={getStep2Data()}
                  />
                )}
              </View>
            </View>
            <View style={[styles.bottomSpacer, { height: keyboardVisible ? 10 : spacingConfig.bottomSpacerHeight }]} />
          </BaseAuthLayout>
        )}
      </KeyboardAvoidingView>
  {/* Área azul inferior y botones FUERA del KeyboardAvoidingView para evitar errores de renderizado */}
  {/* Agregar un margen extra del 2% de la altura para separar los botones de la banda inferior */}
  {/** extraMargin se calcula en tiempo de ejecución para ser responsivo */}
  <View style={[styles.bottomButtonRowFixed, { paddingBottom: height < 700 ? 8 : 0 }]}>
        <Svg width={'100%'} height={svgHeight} viewBox={`0 -30 1000 170`} preserveAspectRatio="none" style={styles.bottomSvgFixed}>
          <Path
            d={`M 0 70 Q 400 -30 1000 0 L 1000 ${svgHeight} L 0 ${svgHeight} Z`}
            fill="#0A4A90"
          />
        </Svg>
          {/* Calcular un margen extra del 2% de la altura y sumarlo al offset inferior */}
          <View style={[styles.buttonRowFixed, { position: 'absolute', left: 0, right: 0, bottom: Math.round(svgHeight * (height < 700 ? 0.20 : 0.28)) + Math.round(height * 0.02) }]}>
          <TouchableOpacity
            style={[styles.backButton, { width: backSize, height: backSize, borderRadius: Math.round(backSize/2), marginBottom: 0, transform: [{ translateY: backTranslateClamped }] }]}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={backIcon} color="#0A4A90" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.continueButton,
              { width: continueSize, height: continueSize, borderRadius: Math.round(continueSize/2) },
              loading && styles.continueButtonDisabled,
              { marginBottom: 0, transform: [{ translateY: continueTranslate }] },
            ]}
            onPress={() => {
              if (loading) return;
              if (currentStep === 1) {
                if ((global as any).validateStep1) {
                  (global as any).validateStep1();
                }
              } else if (currentStep === 2) {
                const currentPhone = (global as any).getCurrentPhone ? (global as any).getCurrentPhone() : '';
                if (!currentPhone) {
                  AppAlert.alert(
                    '¿Seguro que quieres omitir tu teléfono?',
                    'Podrás agregarlo más tarde en tu perfil.',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Omitir', style: 'destructive', onPress: () => { if ((global as any).validateStep2) { (global as any).validateStep2(true); } } },
                    ]
                  );
                } else {
                  if ((global as any).validateStep2) {
                    (global as any).validateStep2();
                  }
                }
              } else if (currentStep === 3) {
                if ((global as any).validateStep3) {
                  (global as any).validateStep3();
                }
              }
            }}
            activeOpacity={loading ? 1 : 0.8}
            disabled={loading}
          >
            <Text
              allowFontScaling={false}
              style={[
                styles.continueButtonText,
                // Ensure button text scales reasonably with the button; cap max size so it doesn't become huge
                { fontSize: Math.min(Math.max(responsiveLayout.fontSize ? responsiveLayout.fontSize(14) : 16, Math.round(continueSize * 0.18)), 18) },
                loading && styles.continueButtonTextDisabled,
              ]}
            >
              {loading ? '...' : currentStep === 3 ? 'Finalizar' : 'Continuar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
  {(loading || localLoading) && (
    <Modal visible transparent animationType="fade" hardwareAccelerated={Platform.OS === 'android'} statusBarTranslucent onRequestClose={() => {}}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' }}>
  <ActivityIndicator size={Platform.OS === 'android' ? 120 : 'large'} color="#0A4A90" />
      </View>
    </Modal>
  )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%',
    marginTop: 8,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingBottom: 20,
    paddingTop: 0,
    minHeight: 420, // Asegura espacio mínimo para inputs en pantallas pequeñas
  },
  formContainer: {
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressBarMinimalContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  progressBarTrack: {
    width: '85%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0A4A90',
    borderRadius: 2,
  },
  progressBarDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '85%',
  },
  progressBarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  stepContent: {
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  bottomSpacer: {
    width: '100%',
  },
  bottomButtonRowFixed: {
    width: '100%',
    position: 'absolute',
    left: 0,
    bottom: 0, // Volver a bottom como footer
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 0,
    zIndex: 10,
  },
  bottomSvgFixed: {
    position: 'absolute',
    left: 0,
    bottom: 0,
  },
  buttonRowFixed: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 30,
    paddingVertical: 20, // Más padding para subir los botones
    position: 'relative',
    zIndex: 11,
  },
  backButton: {
    backgroundColor: '#fff',
    borderRadius: 45, // Circular
    width: 70,
    height: 70,
    borderWidth: 1,
    borderColor: '#0A4A90',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButton: {
    backgroundColor: '#fff',
    borderRadius: 40, // Circular
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: '#0A4A90',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#E5E7EB',
  },
  continueButtonText: {
    color: '#0A4A90', // Cambiar a azul como el icono
    fontWeight: 'bold',
    fontSize: 16,
  },
  continueButtonTextDisabled: {
    color: '#7AA7D9',
  },
});