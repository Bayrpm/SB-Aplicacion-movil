import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Animated, Dimensions, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

const { width, height } = Dimensions.get('window');

const TOTAL_STEPS = 3;

export default function SignUpScreen() {
  // Posicionamiento actualizado v1.1
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

  // Asegurar que inicie en paso 1 cuando se monta el componente
  React.useEffect(() => {
    // Si por alguna razón no está en paso 1, resetear
    if (currentStep !== 1) {
      cancelRegistration();
    }
  }, []);

  // Detectar cuando aparece/desaparece el teclado
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

  // Estados para el teclado
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  
  // Referencia para el scroll dentro de la card
  // scrollViewRef ahora viene del hook useSmartScroll

  // Animación simple y estable
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const progressAnim = React.useRef(new Animated.Value(1)).current;
  
  // Animación muy sutil para cambio de pasos (opcional)
  React.useEffect(() => {
    // Solo una animación muy sutil, sin fade out completo
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

  // Animación del progreso
  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStep,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    // Resetear scroll al cambiar de paso sin animación para evitar efectos raros
    resetScrollImmediate();
  }, [currentStep]);

  // Hooks para manejo de estado
  const { hasStep1Errors, hasStep3Errors } = useValidationErrors();
  
  // Determinar si hay errores en el step actual
  const currentStepHasErrors = React.useMemo(() => {
    if (currentStep === 1) return hasStep1Errors();
    if (currentStep === 3) return hasStep3Errors();
    return false;
  }, [currentStep, hasStep1Errors, hasStep3Errors]);

  // Hook de layout responsivo
  const responsiveLayout = useResponsiveLayout({
    currentStep,
    keyboardVisible,
    keyboardHeight,
    hasErrors: currentStepHasErrors,
  });

  // Extraer valores del layout responsivo
  const { cardHeight, cardTop, titleTop, spacingConfig } = responsiveLayout;
  
  // Función para compatibilidad con el hook useSmartScroll
  const getCardHeight = React.useCallback(() => cardHeight, [cardHeight]);

  // Hooks para manejo de estado
  const { activeInput } = useActiveInput();
  const { scrollViewRef, resetScroll, resetScrollImmediate, getSpacerOffset } = useSmartScroll({
    currentStep,
    keyboardVisible,
    activeInput,
    getCardHeight,
  });

  // La lógica de scroll se maneja ahora en el hook useSmartScroll

  // Reseteo mínimo para evitar problemas
  useFocusEffect(
    React.useCallback(() => {
      // Simplemente asegurar visibilidad completa
      fadeAnim.setValue(1);
    }, [])
  );

  // Barra de progreso minimalista - componente estable
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

  // Manejar navegación de vuelta con animación suave
  const handleBack = () => {
    if (currentStep === 1) {
      // Volver a WelcomeScreen sin animación que cause opacidad
      router.back();
    } else {
      // Volver al paso anterior
      goBack();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        // Paso 1: Nombre y apellido
        return <RegistrationStep1 
          onNext={saveStep1Data} 
          onCancel={handleBack}
          initialData={getStep1Data()}
        />;
      case 2:
        // Paso 2: Teléfono (opcional)
        return <RegistrationStep2 
          onNext={saveStep2Data} 
          onSkip={skipStep2} 
          onBack={goBack}
          initialData={getStep2Data()}
        />;
      case 3:
        // Paso 3: Correo y contraseña
        return <RegistrationStep3 
          onNext={saveStep3Data} 
          onBack={goBack}
          initialData={getStep3Data()}
        />;
      default:
        return null;
    }
  };



  // Esta definición duplicada se eliminó - ahora está arriba antes de los hooks

  // Esta definición duplicada se eliminó - ahora está arriba antes de los hooks

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <BaseAuthLayout
            title="Bienvenidos" // Título siempre visible
            showLogo={true}
            cardHeight={cardHeight}
            cardTop={cardTop}
            hideBottomBand={true}
            logoInContent={true}
            titleTop={titleTop} // Título dinámico calculado por el hook responsivo
          >
            {/* Barra de progreso estática debajo del logo */}
            <ProgressBarMinimal />
            
            {/* ScrollView automático - sin interacción manual */}
            {/* ScrollView automático - funcionaba correctamente antes */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                { 
                  paddingBottom: spacingConfig.paddingBottom, // Calculado por el hook responsivo
                  paddingTop: (currentStep === 1 || currentStep === 3) ? getSpacerOffset() : 0, // Espaciador para step 1 y 3
                }
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={false} // Deshabilitar scroll manual
              automaticallyAdjustContentInsets={false}
            >
              {/* Contenido de los pasos con espaciado igual a signIn */}
              <View style={styles.formContainer}>
                <Animated.View
                  style={[
                    styles.stepContent,
                    { 
                      opacity: fadeAnim,
                    }
                  ]}
                >
                  {renderStep()}
                </Animated.View>
              </View>
              
              {/* Espacio inferior para el scroll - dinámico calculado por hook responsivo */}
              <View style={[
                styles.bottomSpacer, 
                { height: spacingConfig.bottomSpacerHeight }
              ]} />
            </ScrollView>
          </BaseAuthLayout>
        </KeyboardAvoidingView>
        
        {/* Área circular en esquina derecha con botones - DINÁMICA */}
        <View style={[styles.circularButtonArea, { height: spacingConfig.buttonAreaHeight }]}>
          <Svg style={styles.circularBackground} width={width} height={spacingConfig.buttonAreaHeight}>
            <Path
              d={`M 0 150 Q ${width * 0.5} 10 ${width} 30 L ${width} ${spacingConfig.buttonAreaHeight} L 0 ${spacingConfig.buttonAreaHeight} Z`}
              fill="#0A4A90"
            />
          </Svg>
          
          {/* Botones dentro del área circular */}
          
          {/* Botón continuar a la derecha */}
          <View style={styles.rightButtonsContainer}>
            <TouchableOpacity
              style={[styles.continueButton, loading && styles.continueButtonDisabled]}
              onPress={() => {
                if (loading) return; // Evitar múltiples clics durante loading
                
                if (currentStep === 1) {
                  // Usar la función global de validación del step 1
                  if ((global as any).validateStep1) {
                    (global as any).validateStep1();
                  }
                } else if (currentStep === 2) {
                  // Verificar si el teléfono está vacío antes de continuar
                  const currentPhone = (global as any).getCurrentPhone ? (global as any).getCurrentPhone() : '';
                  
                  if (!currentPhone) {
                    // Si el teléfono está vacío, mostrar modal de confirmación
                    Alert.alert(
                      '¿Seguro que quieres omitir tu teléfono?',
                      'Podrás agregarlo más tarde en tu perfil.',
                      [
                        {
                          text: 'Cancelar',
                          style: 'cancel',
                        },
                        {
                          text: 'Omitir',
                          style: 'destructive',
                          onPress: () => {
                            if ((global as any).validateStep2) {
                              (global as any).validateStep2(true);
                            }
                          },
                        },
                      ]
                    );
                  } else {
                    // Si hay teléfono, validar normalmente
                    if ((global as any).validateStep2) {
                      (global as any).validateStep2();
                    }
                  }
                } else if (currentStep === 3) {
                  // Usar la función global de validación del step 3
                  if ((global as any).validateStep3) {
                    (global as any).validateStep3();
                  }
                }
              }}
              activeOpacity={loading ? 1 : 0.8}
              disabled={loading}
            >
              <Text style={[styles.continueButtonText, loading && styles.continueButtonTextDisabled]}>
                {loading ? '...' : currentStep === 3 ? 'Finalizar' : 'Continuar'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botones a la izquierda */}
          <View style={styles.leftButtonsContainer}>
            {/* Botón volver pequeño */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#0A4A90" />
            </TouchableOpacity>
            

          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ScrollView dentro de la card
  scrollView: {
    flex: 1,
    width: '100%',
    marginTop: 8, // Pequeño margen después del progress indicator
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start', // Contenido desde arriba
    paddingBottom: 20, // Espaciado inferior dentro de la card
    paddingTop: 0, // Espacio superior para permitir scroll hacia arriba
  },
  
  // Contenedor de formulario - idéntico a signIn
  formContainer: {
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16, // Igual que signIn
    paddingVertical: 12,   // Igual que signIn
    minHeight: undefined,
  },
  
  // Barra de progreso estática - espaciado compacto
  progressBarMinimalContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,   // Espacio reducido arriba
    marginBottom: 8, // Espacio mínimo antes del scroll
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
  
  // Contenido de pasos - igual que signIn
  stepContent: {
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    marginBottom: 12, // Espacio antes de botones
  },
  
  // Espaciador inferior
  bottomSpacer: {
    height: 40, // Reducido para mejor proporción
  },
  // Área circular completa - height dinámico aplicado inline
  circularButtonArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  circularBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  rightButtonsContainer: {
    position: 'absolute',
    bottom: 100,
    right: 30,
    alignItems: 'center',
  },
  leftButtonsContainer: {
    position: 'absolute',
    bottom: 45,
    left: 30,
    alignItems: 'center',
    gap: 14,
  },

  continueButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#F5F5F5',
  },
  continueButtonText: {
    color: '#0A4A90',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Nunito-Bold' : Platform.OS === 'android' ? 'Nunito-Bold' : 'Quicksand-Bold',
  },
  continueButtonTextDisabled: {
    color: '#999',
  },
  backButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },


});