import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Animated, Dimensions, Image, Keyboard, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { signInUser } from '../api/auth.api';
import BaseAuthLayout from '../components/BaseAuthLayout';

const { width, height } = Dimensions.get('window');

export default function SignInScreen() {
  const [step, setStep] = React.useState(1); // 1: email, 2: password
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const router = useRouter();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const emailInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);
  const scrollYRef = React.useRef(0);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  
  // Valores animados
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  const buttonFadeAnim = React.useRef(new Animated.Value(0)).current;
  const screenFadeAnim = React.useRef(new Animated.Value(0)).current;
  
  // Animaciones específicas para elementos del step 2
  const emailInfoAnim = React.useRef(new Animated.Value(0)).current;
  const emailDisplayAnim = React.useRef(new Animated.Value(0)).current;
  const passwordLabelAnim = React.useRef(new Animated.Value(0)).current;
  const passwordInputAnim = React.useRef(new Animated.Value(0)).current;

  // Detectar cuando aparece/desaparece el teclado
  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      // Volver al inicio cuando se oculta el teclado
      scrollYRef.current = 0;
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => {
      keyboardDidHideListener?.remove();
      keyboardDidShowListener?.remove();
    };
  }, []);

  // Animación de entrada inicial de la pantalla
  React.useEffect(() => {
    // Asegurar que los estados estén limpios al montar
    setIsLoading(false);
    setShowPassword(false);
    
    Animated.timing(screenFadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, []);

  // Resetear estados básicos cuando la pantalla se enfoca (simplificado)
  useFocusEffect(
    React.useCallback(() => {
      // Solo resetear loading por seguridad
      setIsLoading(false);
    }, [])
  );

  // Efecto para manejar el scroll cuando cambia a step 2 y hay teclado visible
  React.useEffect(() => {
    if (step === 2 && keyboardVisible && passwordInputRef.current) {
      // Animación ultra rápida: respuesta casi inmediata
      setTimeout(() => {
        measureAndScrollTo(passwordInputRef);
      }, 30);
    }
  }, [step, keyboardVisible]);

  // Animaciones mejoradas cuando cambia el step
  React.useEffect(() => {
    // Reset animaciones
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    buttonFadeAnim.setValue(0);
    
    // Reset animaciones específicas del step 2
    if (step === 2) {
      emailInfoAnim.setValue(0);
      emailDisplayAnim.setValue(0);
      passwordLabelAnim.setValue(0);
      passwordInputAnim.setValue(0);
    }
    
    // Animaciones más rápidas y fluidas
    if (step === 1) {
      // Animación rápida para email
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        // Botones aparecen al mismo tiempo
        Animated.timing(buttonFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animación en cascada más rápida para password
      Animated.parallel([
        // Base del contenedor - rápido
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        // Elementos aparecen en cascada rápida
        Animated.stagger(50, [
          Animated.timing(emailInfoAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(emailDisplayAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(passwordLabelAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(passwordInputAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        // Botones aparecen rápido
        Animated.timing(buttonFadeAnim, {
          toValue: 1,
          duration: 100,
          delay: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [step]);

  const handleNext = () => {
    if (step === 1) {
      if (!email.trim()) {
        Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
        return;
      }
      // Validación básica de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert('Error', 'Por favor ingresa un correo electrónico válido');
        return;
      }
      setStep(2);
      // Auto-focus ultra rápido en el input de contraseña
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 20);
    } else {
      handleSignIn();
    }
  };

  const handleSignIn = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu contraseña');
      return;
    }
    
    setIsLoading(true);
    try {
      await signInUser(email, password);
      // Animación de salida rápida antes de navegar al dashboard
      Animated.parallel([
        Animated.timing(screenFadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Solo navegar si el login fue exitoso
        router.push('/(tabs)' as any);
      });
    } catch (error) {
      // En caso de error, resetear animación y mostrar mensaje
      screenFadeAnim.setValue(1);
      setIsLoading(false);
      Alert.alert('Error', 'Credenciales incorrectas');
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      // Animación suave y cómoda: fade + slide
      Animated.parallel([
        Animated.timing(screenFadeAnim, {
          toValue: 0.7,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.6,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Navegación después de la animación suave
        router.back();
      });
    }
  };

  // Dimensiones de card y elementos internos
  const baseCardHeight = step === 1 ? 0.45 : 0.55;
  const baseCardTop = 0.30;
  const currentCardHeight = baseCardHeight * height;
  const cardW = 0.84 * width;
  const cardPaddingPx = Math.max(24, Math.round(0.03 * height));
  const safeContentW = cardW - cardPaddingPx * 2;
  const innerPaddingX = 16; // debe coincidir con styles.formContainer.paddingHorizontal
  const safeFieldW = Math.max(0, safeContentW - innerPaddingX * 2);

  // Tamaños fijos objetivo con clamp para evitar desbordes laterales
  const targetFieldW = 280;
  const fieldW = Math.min(targetFieldW, Math.max(240, safeFieldW));
  const buttonW = fieldW; // Botones e inputs comparten ancho visual fijo (con clamp)
  const buttonH = 56; // Altura fija para botones

  // Card dinámica con teclado: scroll + mayor crecimiento para password
  const cardHeightProp = keyboardVisible 
    ? (step === 1 
        ? Math.min(0.60, baseCardHeight + 0.05)  // Email: expansión mínima
        : Math.min(0.65, baseCardHeight + 0.08)) // Password: expansión mayor
    : baseCardHeight;
  const cardTopProp = keyboardVisible 
    ? (step === 1 
        ? Math.max(0.28, baseCardTop - 0.1)     // Email: subida mínima
        : Math.max(0.24, baseCardTop - 0.08))   // Password: más crecimiento hacia arriba
    : baseCardTop;

  // Logo dentro del ScrollView para que se mueva junto con inputs
  const logoW = Math.min(safeContentW, 0.60 * cardW);
  const logoH = 0.15 * currentCardHeight;

  const measureAndScrollTo = (inputRef: React.RefObject<TextInput | null>) => {
    // Esperar al layout/teclado
    setTimeout(() => {
      // GAP diferenciado: email necesita menos scroll, password necesita scroll extremo
      const GAP = step === 1 ? 20 : 150; // px - email: mínimo, password: extremadamente agresivo
      const windowH = height;
      const kbdTop = windowH - keyboardHeight;
      
      inputRef.current?.measureInWindow?.((x, y, w, h) => {
        const inputBottom = y + h;
        const desiredBottom = kbdTop - GAP;
        const delta = inputBottom - desiredBottom; // positivo: falta subir; negativo: sobra
        
        if (Math.abs(delta) > 1) {
          const nextY = Math.max(0, scrollYRef.current + delta);
          scrollYRef.current = nextY;
          // Scroll más rápido: sin animación para respuesta inmediata
          scrollViewRef.current?.scrollTo({ y: nextY, animated: false });
        }
      });
    }, 10); // Timeout ultra reducido para animación súper rápida
  };

  const handleEmailFocus = () => measureAndScrollTo(emailInputRef);
  const handlePasswordFocus = () => measureAndScrollTo(passwordInputRef);



  return (
    <Animated.View style={{ flex: 1, opacity: screenFadeAnim }}>
      <BaseAuthLayout 
        title="Bienvenido" 
        showLogo={false}
        cardHeight={cardHeightProp}
        cardTop={cardTopProp}
      >
        <View style={styles.formContainer}>
        {/* Solo inputs hacen scroll; logo fijo visible en la card */}
        <ScrollView
          ref={scrollViewRef}
          style={[styles.inputScroll, keyboardVisible && { maxHeight: height * 0.45 }]}
          contentContainerStyle={[
            styles.inputScrollContent, 
            keyboardVisible ? { paddingBottom: 160 } : { paddingBottom: 10 } // Más padding para permitir scroll
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={false}
          bounces={false}

        >
        {/* Espacio superior para permitir scroll hacia arriba */}
        <View style={{ height: keyboardVisible ? 100 : 20 }} />
        
        {/* Logo que se mueve junto con inputs */}
        <View style={styles.logoBlock}>
          <Image
            source={require('@/assets/images/img_logo.png')}
            style={{ width: logoW, height: logoH }}
            resizeMode="contain"
          />
        </View>
        
        <Animated.View 
          style={[
            styles.inputSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {step === 1 ? (
            // Paso 1: Email
            <>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                ref={emailInputRef}
                style={[styles.input, { width: fieldW }]}
                placeholder="ejemplo@correo.com"
                value={email}
                onChangeText={setEmail}
                onFocus={handleEmailFocus}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#999"
              />
            </>
          ) : (
            // Paso 2: Password con animaciones en cascada
            <>
              <Animated.Text 
                style={[styles.emailInfo, { opacity: emailInfoAnim }]}
              >
                Iniciando sesión como:
              </Animated.Text>
              <Animated.Text 
                style={[styles.emailDisplay, { opacity: emailDisplayAnim }]}
              >
                {email}
              </Animated.Text>
              <Animated.Text 
                style={[styles.label, { opacity: passwordLabelAnim }]}
              >
                Contraseña
              </Animated.Text>
              <Animated.View 
                style={[
                  styles.passwordContainer, 
                  { 
                    width: fieldW,
                    opacity: passwordInputAnim,
                    transform: [{
                      translateY: passwordInputAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      })
                    }]
                  }
                ]}
              >
                <TextInput
                  ref={passwordInputRef}
                  style={styles.passwordInput}
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={handlePasswordFocus}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.showPasswordText}>
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </Animated.View>
        </ScrollView>

  {/* Botones fijos, fuera del scroll de inputs */}
  <Animated.View 
    style={[
      styles.buttonGroup,
      { opacity: buttonFadeAnim }
    ]}
  >
          <TouchableOpacity
            style={[
              styles.pillButton, 
              { 
                height: buttonH, 
                width: buttonW,
                opacity: isLoading ? 0.6 : 1
              }
            ]}
            onPress={handleNext}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <Text style={styles.pillButtonText}>
              {step === 1 ? 'Siguiente' : isLoading ? 'Iniciando...' : 'Iniciar sesión'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.secondaryButton, { height: buttonH - 8, width: buttonW }]}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              {step === 1 ? 'Volver' : 'Cambiar correo'}
            </Text>
          </TouchableOpacity>
          </Animated.View>
        </View>
      </BaseAuthLayout>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    width: '100%',
  },

  scrollView: {
    flex: 1,
  },
  // Scroll exclusivo para inputs
  inputScroll: {
    width: '100%',
    maxHeight: height * 0.45, // área scrolleable solo para inputs
    overflow: 'hidden',
  },
  inputScrollContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: height * 0.25, // suficiente para el 20% al aparecer teclado
  },
  formContainer: {
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: undefined,
  },
  inputSection: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'stretch',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    textAlign: 'left',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    color: '#333',
    minHeight: 50,
  },
  passwordContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingRight: 4,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    minHeight: 50,
  },
  showPasswordButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 4,
  },
  showPasswordText: {
    fontSize: 14,
    color: '#0A4A90',
    fontWeight: '600',
  },
  emailInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  emailDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A4A90',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  pillButton: {
    backgroundColor: '#0A4A90',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  pillButtonText: {
    color: '#FFFFFF',
    fontSize: Math.max(18, Math.min(20, 0.024 * height)),
    fontWeight: '700',
    letterSpacing: 0.3,
    fontFamily:
      Platform.OS === 'ios'
        ? 'Nunito-Bold'
        : Platform.OS === 'android'
        ? 'Nunito-Bold'
        : 'Quicksand-Bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0A4A90',
  },
  secondaryButtonText: {
    color: '#0A4A90',
    fontSize: Math.max(16, Math.min(18, 0.022 * height)),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
});
