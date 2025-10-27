import { ThemedView } from '@/components/themed-view';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Animated, Dimensions, Image, Keyboard, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { signInUser } from '../api/auth.api';
import BaseAuthLayout from '../components/baseAuthLayout';
import { useAuth } from '../context';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const { width, height } = Dimensions.get('window');

export default function SignInScreen() {
  const scheme = useColorScheme();
  const placeholderColor = useThemeColor({ light: '#9CA3AF', dark: '#FFFFFF' }, 'icon');
  const tintColor = useThemeColor({ light: '#0A4A90', dark: '#BFC7CC' }, 'tint');
  const logoSource = scheme === 'dark' ? require('@/assets/images/img_logo_blanco.png') : require('@/assets/images/img_logo.png');
  const labelColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({ light: '#F8F9FA', dark: '#000000' }, 'background');
  const inputBorder = useThemeColor({ light: '#E9ECEF', dark: '#FFFFFF' }, 'icon');
  const inputTextColor = useThemeColor({}, 'text');
  const [step, setStep] = React.useState(1); // 1: email, 2: password
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const loadingTimerRef = React.useRef<number | null>(null);
  const loadingStartRef = React.useRef<number | null>(null);
  const MIN_LOADING_MS = 900;

  const startLoading = () => {
    loadingStartRef.current = Date.now();
    setIsLoading(true);
  };

  const stopLoading = () => {
    const started = loadingStartRef.current ?? 0;
    const elapsed = Date.now() - started;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
    if (remaining > 0) {
      // @ts-ignore setTimeout returns number in RN
      loadingTimerRef.current = setTimeout(() => {
        setIsLoading(false);
        loadingStartRef.current = null;
        loadingTimerRef.current = null;
      }, remaining) as unknown as number;
    } else {
      setIsLoading(false);
      loadingStartRef.current = null;
    }
  };
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const router = useRouter();
  const auth = useAuth();
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

  const handleNext = async () => {
    if (step === 1) {
      if (!email.trim()) {
        AppAlert.alert('Error', 'Por favor ingresa tu correo electrónico');
        return;
      }
      // Validación básica de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        AppAlert.alert('Error', 'Por favor ingresa un correo electrónico válido');
        return;
      }
      // Comprobar existencia del correo antes de pedir la contraseña
      startLoading();
      try {
        const res = await signInUser(email, ''); // password vacío = existencia
        if (res.error) {
          const msg = res.error?.message || 'Ocurrió un error al verificar el correo';
          AppAlert.alert('Error', msg);
          stopLoading();
          return;
        }
        if (!res.exists) {
          AppAlert.alert(
            'Cuenta no encontrada',
            'No existe una cuenta asociada a este correo. ¿Deseas registrarte?',
            [
              { text: 'No', style: 'cancel' },
              {
                text: 'Registrarme',
                onPress: () => {
                  try { router.push('/(auth)/signUp'); } catch (e) {}
                },
              },
            ]
          );
          stopLoading();
          return;
        }
        // Si existe, avanzar al paso de contraseña
        setStep(2);
        // Auto-focus ultra rápido en el input de contraseña
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 20);
      } catch (e) {
        AppAlert.alert('Error', 'Ocurrió un error al verificar el correo');
      } finally {
        stopLoading();
      }
    } else {
      handleSignIn();
    }
  };

  const handleSignIn = async () => {
    if (!password.trim()) {
      AppAlert.alert('Error', 'Por favor ingresa tu contraseña');
      return;
    }
    
    // garantizar duración mínima del overlay
    startLoading();
    try {
      const result = await signInUser(email, password);
  // Resultado del signIn disponible en `result` (no se imprime en consola en prod)
      if (result.error) {
        // Mostrar el mensaje de error retornado por la API
        const message = result.error.message || 'Se han ingresado credenciales incorrectas';
        AppAlert.alert('Error', message);
        stopLoading();
        return;
      }
      // Actualizar rápidamente el provider con el resultado obtenido para
      // evitar condiciones de carrera en la elección del tab.
      try {
        auth?.setAuthState?.({ profile: result.profile ?? null, isInspector: typeof result.isInspector === 'boolean' ? result.isInspector : undefined });
      } catch (e) {
        // noop
      }
      // Navegar inmediatamente al tab correspondiente para evitar flashes
      try {
        if (typeof result.isInspector === 'boolean') {
          const target = result.isInspector ? '/inspector/inspectorHome' : '/citizen/citizenHome';
          router.replace(target as any);
        }
      } catch (e) {
        // noop
      }

      // Animación de salida rápida (opcional) y dejar que el layout principal redirija
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
        // No navegar manualmente, el layout principal lo hará automáticamente
        // detener el overlay local después de la animación
        stopLoading();
      });
    } catch (error) {
      // En caso de error inesperado
      console.error('Error al iniciar sesión:', error);
      AppAlert.alert('Error', 'Ocurrió un error al iniciar sesión');
      stopLoading();
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
        // Navegación después de la animación suave: replace al welcome group para evitar flash
        router.replace('/(auth)');
      });
    }
  };

  // Dimensiones de card y elementos internos
  // Ajuste por pedido: step 1 más compacto (0.38), step 2 más alto (0.48)
  const baseCardHeight = step === 1 ? 0.38 : 0.48;
  const baseCardTop = 0.30;
  const currentCardHeight = baseCardHeight * height;
  const isSmall = height < 700;
  const cardW = 0.84 * width;
  const cardPaddingPx = Math.max(24, Math.round(0.03 * height));
  const safeContentW = cardW - cardPaddingPx * 2;
  const innerPaddingX = 16; // debe coincidir con styles.formContainer.paddingHorizontal
  const safeFieldW = Math.max(0, safeContentW - innerPaddingX * 2);

  // Tamaños fijos objetivo con clamp para evitar desbordes laterales
  const targetFieldW = 280;
  const fieldW = Math.min(targetFieldW, Math.max(240, safeFieldW));
  // Ensure field width never exceeds the available screen width minus margins
  // Allow slightly larger effective width while keeping small margins
  const effectiveFieldW = Math.min(fieldW, Math.round(width - 24));
  // Final defensive clamp: ensure not wider than card inner safe field width
  const finalFieldW = Math.min(effectiveFieldW, safeFieldW, Math.round(width * 0.94));
  const buttonW = fieldW; // Botones e inputs comparten ancho visual fijo (con clamp)
  const buttonH = 56; // Altura fija para botones

  // Card dinámica: mover la card más arriba y hacerla un poco más alta en step 2 cuando el teclado está visible
  const cardHeightProp = (step === 2 && keyboardVisible)
    ? Math.min(isSmall ? 0.78 : 0.70, baseCardHeight + (isSmall ? 0.18 : 0.12)) // más espacio en pantallas pequeñas
    : baseCardHeight;
  // Move the card upwards on SignIn by a fixed extra fraction so it sits higher
  // across both steps (improves visibility of inputs). Extra is 5% of screen.
  const extraUp = 0.05; // 5% of screen height
  const cardTopProp = Math.max(0, baseCardTop - extraUp);

  // Ensure the card never overflows the bottom edge: compute an adjusted cardHeight fraction
  const minBottomGapPx = Math.round(Math.max(44, height * 0.04)); // visible margin under the card
  const maxAllowedCardHeight = Math.max(0.2, (1 - minBottomGapPx / height) - cardTopProp);
  let adjustedCardHeightProp = Math.min(cardHeightProp, maxAllowedCardHeight);

  // Reserve space for the bottom footer (SVG + buttons). Use conservative estimates so card never goes underneath.
  const estimatedSvgHeight = keyboardVisible ? Math.round(height * 0.12) : Math.round(height * 0.26);
  const estimatedButtonsHeight = Math.round(height * 0.82); // conservative buttons area
  const footerReservePx = estimatedSvgHeight + estimatedButtonsHeight + minBottomGapPx;

  // Compute card bottom in px and cap adjustedCardHeightProp if it would collide with footerReservePx
  const cardTopPx = Math.round(cardTopProp * height);
  const desiredCardHeightPx = Math.round(adjustedCardHeightProp * height);
  const maxCardHeightPx = Math.max(0, height - footerReservePx - cardTopPx);
  if (desiredCardHeightPx > maxCardHeightPx) {
    // reduce adjustedCardHeightProp to fit but never below the configured base
    // card height for the current step (so we don't accidentally inflate the
    // card on step 1 to a larger fixed minimum).
    adjustedCardHeightProp = Math.max(baseCardHeight, maxCardHeightPx / height);
  }

  // Logo dentro del ScrollView para que se mueva junto con inputs
  const logoScale = scheme === 'dark' ? 1.25 : 1; // aumentar en dark mode
  const logoW = Math.min(safeContentW, 0.60 * cardW) * logoScale;
  const logoH = 0.15 * currentCardHeight * logoScale;

  const measureAndScrollTo = (inputRef: React.RefObject<TextInput | null>) => {
    // Only attempt programmatic scroll when keyboard is visible and for password (step 2).
    if (!keyboardVisible) return;
    if (step === 1) return; // Do not auto-scroll for email to avoid undesired jumps

    // Esperar al layout/teclado
    setTimeout(() => {
      // GAP moderado para password: depende del tamaño de pantalla
      const GAP = isSmall ? 70 : 90; // px
      const windowH = height;
      const kbdTop = windowH - keyboardHeight;

      inputRef.current?.measureInWindow?.((x, y, w, h) => {
        const inputBottom = y + h;
        const desiredBottom = kbdTop - GAP;
        const delta = inputBottom - desiredBottom; // positivo: falta subir; negativo: sobra

        // Require a small threshold to avoid micro-jumps
        if (Math.abs(delta) > 4) {
          const nextY = Math.max(0, scrollYRef.current + delta);
          scrollYRef.current = nextY;
          // Animate the scroll for smoother UX
          scrollViewRef.current?.scrollTo({ y: nextY, animated: true });
        }
      });
    }, 30);
  };

  // Email focus: only scroll up if the input is being occluded by the keyboard (never scroll down towards the footer)
  const emailMeasureScrollUp = (inputRef: React.RefObject<TextInput | null>) => {
    if (!keyboardVisible) return;
    // Small delay to allow layout to settle
    setTimeout(() => {
      const kbdTop = height - keyboardHeight;
      inputRef.current?.measureInWindow?.((x, y, w, h) => {
        const inputBottom = y + h;
        // If input bottom is below keyboard top, compute delta to move it just above keyboard
        if (inputBottom > kbdTop) {
          const desiredBottom = kbdTop - 18; // small margin above keyboard
          const delta = inputBottom - desiredBottom;
          // Only act on meaningful occlusions
          if (delta > 6) {
            // Cap the upward scroll when on email so the card doesn't jump too far
            const maxEmailScroll = Math.round(height * 0.10); // allow only up to ~10% of screen on email
            const desiredNext = scrollYRef.current + delta;
            // Only scroll upwards (increase y). Never reduce scrollY (no push down).
            if (desiredNext > scrollYRef.current) {
              const nextY = Math.max(0, Math.min(desiredNext, scrollYRef.current + maxEmailScroll));
              scrollYRef.current = nextY;
              scrollViewRef.current?.scrollTo({ y: nextY, animated: true });
            }
          }
        }
      });
    }, 30);
  };
  
  const handleEmailFocus = () => emailMeasureScrollUp(emailInputRef);
  const handlePasswordFocus = () => measureAndScrollTo(passwordInputRef);

  // Spacer above content: keep small on step 1 to avoid pushing logo/inputs down
  // when the keyboard appears. Step 2 can use a slightly larger spacer to allow
  // password animations room.
  const topSpacer = step === 2 ? (keyboardVisible ? (isSmall ? 12 : 36) : 20) : 12;

  // keep responsiveLayout object for footer math
  const responsiveLayout = useResponsiveLayout({ currentStep: step, keyboardVisible, keyboardHeight, hasErrors: false });

  // Mostrar overlay de carga local mientras se realiza el sign in



  return (
    <ThemedView style={{ flex: 1 }}>
  <Animated.View style={{ flex: 1, opacity: screenFadeAnim }}>
      <BaseAuthLayout 
        title="Bienvenido" 
        showLogo={false}
        cardHeight={adjustedCardHeightProp}
        cardTop={cardTopProp}
        contentCentered={false}
        hideBottomBand={true}
        clipOverflow={keyboardVisible && step === 2}
      >
        <View style={styles.formContainer}>
        {/* Solo inputs hacen scroll; logo fijo visible en la card */}
          <ScrollView
          ref={scrollViewRef}
          style={[styles.inputScroll, keyboardVisible && { maxHeight: height * 0.45, overflow: 'visible' }]}
          contentContainerStyle={[
            styles.inputScrollContent,
            // dynamic padding so there's always room to scroll content above the keyboard
            keyboardVisible
              ? { paddingBottom: Math.max(minBottomGapPx, keyboardHeight + minBottomGapPx) }
              : { paddingBottom: 10 }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // Allow scrolling only when the keyboard is visible so we can nudge
          // content upwards for occluded inputs without enabling free scroll
          // in the rest of the UI.
          scrollEnabled={keyboardVisible}
          bounces={false}

        >
  {/* Espacio superior para permitir scroll hacia arriba */}
  <View style={{ height: topSpacer }} />
        
        {/* Logo que se mueve junto con inputs. Lo envolvemos en un wrapper con overflow hidden
            para que, al hacer scroll hacia arriba (p. ej. foco en password), el logo quede
            recortado por la tarjeta y no aparezca por encima de ella. */}
        <View style={[styles.logoWrapper, { height: Math.round(logoH + 8) }]}> 
          <View style={styles.logoBlock}>
            <Image
              source={logoSource}
              style={{ width: logoW, height: logoH }}
              resizeMode="contain"
            />
          </View>
        </View>
        
        <View 
          style={[
            styles.inputSection,
            // keep visual animation for container via opacity/transform on children
          ]}
        >
          {step === 1 ? (
            // Paso 1: Email
            <>
              <Text style={[styles.label, { color: labelColor }]}>Correo electrónico</Text>
              <View style={{ width: finalFieldW, alignSelf: 'center', overflow: 'visible', paddingRight: 6 }}>
                <TextInput
                  ref={emailInputRef}
                  style={[
                    styles.input,
                    { width: '100%', backgroundColor: inputBg, borderColor: inputBorder, color: inputTextColor, paddingRight: 28, paddingLeft: 16, minWidth: 0 },
                  ]}
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={handleEmailFocus}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  allowFontScaling={false}
                  multiline={false}
                  placeholderTextColor={placeholderColor}
                />
              </View>
            </>
          ) : (
            // Paso 2: Password con animaciones en cascada
            <>
              <Animated.Text 
                style={[styles.emailInfo, { opacity: emailInfoAnim, color: labelColor }]}
              >
                Iniciando sesión como:
              </Animated.Text>
              <Animated.Text 
                style={[styles.emailDisplay, { opacity: emailDisplayAnim, color: labelColor }]}
              >
                {email}
              </Animated.Text>
              <Animated.Text 
                style={[styles.label, { color: labelColor, opacity: passwordLabelAnim }]}
              >
                Contraseña
              </Animated.Text>
              <View
                style={[
                  styles.passwordContainer,
                  { width: finalFieldW, alignSelf: 'center', backgroundColor: inputBg, borderColor: inputBorder }
                ]}
              >
                <TextInput
                  ref={passwordInputRef}
                  style={[
                    styles.passwordInput,
                    { paddingRight: 52, paddingLeft: 12, color: inputTextColor, backgroundColor: 'transparent', borderWidth: 0 },
                  ]}
                  placeholder="Contraseña"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={handlePasswordFocus}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  allowFontScaling={false}
                  multiline={false}
                  placeholderTextColor={placeholderColor}
                />
                <TouchableOpacity
                  style={[styles.showPasswordButton, { position: 'absolute', right: 12 }]}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={22}
                    color={tintColor}
                  />
                </TouchableOpacity>
      </View>
            </>
          )}
    </View>
        </ScrollView>

  
        </View>
      </BaseAuthLayout>
  {/* Footer SVG + botones (misma apariencia que SignUp) - colocado fuera de la card */}
  {(() => {
    const svgHeight = keyboardVisible ? Math.round(height * 0.12) : Math.round(height * 0.26);
    const continueSize = responsiveLayout.buttonSize ? responsiveLayout.buttonSize(80) : Math.round(width * 0.16);
    const backSize = responsiveLayout.buttonSize ? responsiveLayout.buttonSize(50) : Math.round(width * 0.10);
    const continueIcon = Math.round(continueSize * (responsiveLayout.iconRatio ?? 0.42));
    const backIcon = Math.round(backSize * (responsiveLayout.iconRatio ?? 0.42));
    const backTranslate = responsiveLayout.getBackTranslate ? responsiveLayout.getBackTranslate(svgHeight) : Math.round(svgHeight * 0.12 + height * 0.015);
    const minTranslate = -Math.round(height * 0.02);
    const requestedDown = Math.round(svgHeight * 0.30);
    const maxTranslate = Math.round(Math.max(svgHeight * 0.15, requestedDown));
    const backTranslateClamped = responsiveLayout.clamp ? responsiveLayout.clamp(backTranslate, minTranslate, maxTranslate) : Math.max(minTranslate, Math.min(backTranslate, maxTranslate));
    const continueTranslate = (() => {
      try {
        const desired = Math.round(height * 0.02);
        const maxAllowed = Math.round(svgHeight * 0.25);
        return responsiveLayout.clamp ? responsiveLayout.clamp(desired, 0, maxAllowed) : Math.max(0, Math.min(desired, maxAllowed));
      } catch (e) {
        return Math.round(height * 0.02);
      }
    })();
    return (
      <View style={[styles.bottomButtonRowFixed, { paddingBottom: height < 700 ? 8 : 0 }]}> 
        <Svg width={'100%'} height={svgHeight} viewBox={`0 -30 1000 170`} preserveAspectRatio="none" style={styles.bottomSvgFixed}>
          <Path
            d={`M 0 70 Q 400 -30 1000 0 L 1000 ${svgHeight} L 0 ${svgHeight} Z`}
            fill="#0A4A90"
          />
        </Svg>
        <View style={[styles.buttonRowFixed, { position: 'absolute', left: 0, right: 0, bottom: Math.round(svgHeight * (height < 700 ? 0.20 : 0.28)) + Math.round(height * 0.02) }]}> 
          <TouchableOpacity
            style={[styles.backButton, { width: backSize, height: backSize, borderRadius: Math.round(backSize / 2), marginBottom: 0, transform: [{ translateY: backTranslateClamped }] }]}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={backIcon} color="#0A4A90" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.continueButton,
              { width: continueSize, height: continueSize, borderRadius: Math.round(continueSize / 2) },
              isLoading && styles.continueButtonDisabled,
              { marginBottom: 0, transform: [{ translateY: continueTranslate }] },
            ]}
            onPress={handleNext}
            activeOpacity={isLoading ? 1 : 0.8}
            disabled={isLoading}
          >
            <Text
              allowFontScaling={false}
              style={[
                styles.continueButtonText,
                { fontSize: Math.min(Math.max(14, Math.round(continueSize * 0.18)), 18) },
                isLoading && styles.continueButtonTextDisabled,
              ]}
            >
              {isLoading ? '...' : step === 1 ? 'Siguiente' : 'Iniciar sesión'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  })()}
  {isLoading && (
    <Modal visible transparent animationType="fade" hardwareAccelerated={Platform.OS === 'android'} statusBarTranslucent onRequestClose={() => {}}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' }}>
  <ActivityIndicator size={120} color="#0A4A90" />
      </View>
    </Modal>
  )}
  {/* AlertBox provider is mounted globally in app/_layout.tsx; use AppAlert.alert(...) instead */}
      </Animated.View>
    </ThemedView>
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
    paddingRight: 20,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    color: '#333',
    minHeight: 56,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  passwordContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingRight: 2, // espacio extra para el icono y evitar recorte del texto
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    minHeight: 56,
    lineHeight: 20,
    textAlignVertical: 'center',
    includeFontPadding: false,
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
  logoWrapper: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
    textAlign: 'center',
    alignSelf: 'center',
  },
  continueButtonTextDisabled: {
    color: '#7AA7D9',
  },
});