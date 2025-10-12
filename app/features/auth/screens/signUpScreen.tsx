import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Animated, Dimensions, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import BaseAuthLayout from '../components/BaseAuthLayout';
import { RegistrationStep1 } from '../components/RegistrationStep1';
import { RegistrationStep2 } from '../components/RegistrationStep2';
import { RegistrationStep3 } from '../components/RegistrationStep3';
import { useRegistration } from '../hooks/useRegistration';

const { width, height } = Dimensions.get('window');

const TOTAL_STEPS = 3;

export default function SignUpScreen() {
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
  
  // Estados para el scroll y título
  const [titleVisible, setTitleVisible] = React.useState(true);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const titleOpacity = React.useRef(new Animated.Value(1)).current;

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
        duration: 120,
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
    
    // Resetear scroll y título al cambiar de paso
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    if (!titleVisible) {
      setTitleVisible(true);
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [currentStep]);

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
        return <RegistrationStep1 onNext={saveStep1Data} onCancel={handleBack} />;
      case 2:
        // Paso 2: Teléfono (opcional)
        return <RegistrationStep2 onNext={saveStep2Data} onSkip={skipStep2} onBack={goBack} />;
      case 3:
        // Paso 3: Correo y contraseña
        return <RegistrationStep3 onNext={saveStep3Data} onBack={goBack} />;
      default:
        return null;
    }
  };

  // Título dinámico según el paso - con visibilidad controlada por scroll
  const getTitle = () => {
    return titleVisible ? 'Bienvenidos' : '';
  };

  // Manejar el scroll para ocultar/mostrar título
  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const threshold = 30; // Threshold para ocultar título
    
    if (scrollY > threshold && titleVisible) {
      setTitleVisible(false);
      Animated.timing(titleOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (scrollY <= threshold && !titleVisible) {
      setTitleVisible(true);
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  // Card height dinámica según el contenido del paso y teclado - Universal para todos los dispositivos
  const getCardHeight = () => {
    // Alturas base adaptativas según el contenido de cada paso
    const baseHeights = {
      1: 0.42, // Nombre y apellido - contenido moderado
      2: 0.38, // Teléfono (opcional) - contenido mínimo
      3: 0.52, // Correo y contraseña - contenido máximo (3 inputs)
    };
    
    const baseHeight = baseHeights[currentStep as keyof typeof baseHeights] || 0.42;
    
    // Con teclado: mantener altura mínima pero ajustar si es necesario
    if (keyboardVisible) {
      // Alturas mínimas garantizadas para cada paso con teclado
      const minHeights = {
        1: 0.35, // Mínimo para 2 inputs + barra progreso
        2: 0.30, // Mínimo para 1 input + barra progreso  
        3: 0.45, // Mínimo para 3 inputs + barra progreso
      };
      
      const minHeight = minHeights[currentStep as keyof typeof minHeights] || 0.35;
      
      // Calcular espacio disponible real
      const titleSpace = height * 0.12;
      const buttonAreaHeight = 240;
      const safetyMargin = 30;
      
      const availableSpace = height - keyboardHeight - buttonAreaHeight - titleSpace - safetyMargin;
      const maxPossibleHeight = Math.max(minHeight, (availableSpace * 0.90) / height);
      
      // Usar el mayor entre la altura mínima y el espacio disponible
      return Math.max(minHeight, Math.min(baseHeight, maxPossibleHeight));
    }
    
    return baseHeight;
  };

  // Card top dinámico según el teclado - Universal para todos los dispositivos
  const getCardTop = () => {
    if (keyboardVisible) {
      // Espacio mínimo necesario para título + logo + barra de progreso
      const titleAndLogoSpace = height * 0.15; // Más espacio para evitar cortes
      const progressBarSpace = 60; // Espacio adicional para barra de progreso
      const minRequiredSpace = titleAndLogoSpace + progressBarSpace;
      
      // Posición mínima absoluta para no cortar contenido superior
      const absoluteMinTop = minRequiredSpace / height;
      
      // Calcular posición ideal
      const cardHeight = getCardHeight() * height;
      const buttonAreaHeight = 240;
      const safetyMargin = 20;
      
      // Posición que permita que la card quepa sin superponer botones
      const maxTop = Math.max(absoluteMinTop, (height - cardHeight - buttonAreaHeight - safetyMargin) / height);
      
      // Posiciones adaptativas más conservadoras
      const adaptivePositions = {
        1: Math.max(absoluteMinTop, 0.20), // Más espacio para barra de progreso
        2: Math.max(absoluteMinTop, 0.22), // Posición más baja para input simple
        3: Math.max(absoluteMinTop, 0.18), // Posición ligeramente más alta para 3 inputs
      };
      
      const idealPosition = adaptivePositions[currentStep as keyof typeof adaptivePositions] || absoluteMinTop;
      
      // Usar el menor entre la posición ideal y la máxima permitida
      return Math.min(idealPosition, maxTop);
    }
    
    // Posición por defecto sin teclado - más conservadora
    const defaultPosition = height > 800 ? 0.28 : height > 600 ? 0.26 : 0.24;
    return defaultPosition;
  };

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <BaseAuthLayout
            title={getTitle()}
            showLogo={true}
            cardHeight={getCardHeight()}
            cardTop={getCardTop()}
            hideBottomBand={true}
            logoInContent={true}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: keyboardVisible ? 20 : 80 }
              ]}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Barra de progreso debajo del logo - espaciado coherente */}
              <ProgressBarMinimal />
              
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
              
              {/* Espacio inferior coherente */}
              <View style={styles.bottomSpacer} />
            </ScrollView>
          </BaseAuthLayout>
        </KeyboardAvoidingView>
        
        {/* Área circular en esquina derecha con botones - FIJA */}
        <View style={styles.circularButtonArea}>
          <Svg style={styles.circularBackground} width={width} height={240}>
            <Path
              d={`M 0 150 Q ${width * 0.5} 10 ${width} 30 L ${width} 240 L 0 240 Z`}
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
  // ScrollView principal
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: height * 0.25, // Igual que signIn
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
  
  // Barra de progreso debajo del logo - espaciado coherente
  progressBarMinimalContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,   // Espacio equilibrado arriba
    marginBottom: 36, // Espacio generoso para separar de inputs
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
  // Área circular completa
  circularButtonArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 240,
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