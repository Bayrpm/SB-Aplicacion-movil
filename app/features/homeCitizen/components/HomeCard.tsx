import { IconSymbol } from '@/components/ui/icon-symbol';
import React from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  // minHeight opcional para permitir que la card se ajuste automáticamente
  // al contenido en pantallas pequeñas; si se pasa, actuará como mínimo.
  minHeight?: number;
  title?: string;
  description?: string;
  buttonText?: string;
  onPress?: () => void;
  children?: React.ReactNode;
  // Opciones para personalizar la presentación desde consumidores
  hideIcon?: boolean;
  hideAction?: boolean;
  titleAlign?: 'left' | 'center';
};

export default function HomeCard({
  minHeight,
  title,
  description,
  buttonText = 'Conoce más',
  onPress,
  children,
  hideIcon = false,
  hideAction = false,
  titleAlign = 'left',
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const pressedAnim = React.useRef(new Animated.Value(0)).current;

  const onPressIn = () => {
    Animated.spring(pressedAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  };
  const onPressOut = () => {
    Animated.spring(pressedAnim, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  };

  const scale = pressedAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] });

  // Colors chosen to be modern, accessible and appropriate for a government app.
  // Dark-mode background chosen to contrast with pure black app backgrounds.
  const background = scheme === 'dark' ? '#071229' : '#ffffff';
  const accent = scheme === 'dark' ? '#5EEAD4' : '#0066CC';
  const cardBorder = scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(10,10,10,0.06)';

  // Mover bordes y sombra al contenedor exterior para evitar doble rectángulo
  const wrapperStyle = [
    styles.wrapper,
    minHeight ? { minHeight } : undefined,
    { borderColor: cardBorder, borderWidth: 1, padding: 16 },
  ];

  const wrapperShadow = {
    shadowColor: '#000',
    shadowOpacity: scheme === 'dark' ? 0.14 : 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 8,
  } as any;

  return (
    <ThemedView style={[...wrapperStyle, wrapperShadow]} lightColor={background} darkColor={background}>
      {/* Animated inner view solo aplica la transformación; sin borde ni sombra ni padding */}
      <Animated.View style={[styles.card, { transform: [{ scale }] }] as any}>
        <View style={styles.topRow}>
          {/* Decorative icon optional */}
          {!hideIcon ? (
            <View style={styles.leftDecor} pointerEvents="none">
              <IconSymbol name="megaphone-outline" size={28} color={accent} />
            </View>
          ) : null}

          <View style={styles.content}>
            {title ? (
              <ThemedText
                style={[styles.title, titleAlign === 'center' ? { textAlign: 'center' } : undefined]}
                type="defaultSemiBold"
                lightColor={accent}
                darkColor={accent}
              >
                {title}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {/* Description placed full width below the top row so it begins at the left edge */}
        {description ? (
          <ThemedText style={styles.descriptionFull}>{description}</ThemedText>
        ) : null}

        {/* Custom children (ej. botones de redes) */}
        {children}

        {!hideAction ? (
          <View style={styles.actionContainer}>
            <Pressable
              accessibilityRole="button"
              onPress={onPress}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            >
              <Text style={styles.buttonText}>{buttonText}</Text>
            </Pressable>
          </View>
        ) : null}
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: Platform.select({ android: 'hidden', ios: 'visible' }),
  },
  card: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    borderRadius: 14,
    backgroundColor: 'transparent',
    // no padding, border or shadow here; moved to wrapper to avoid inner rect
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  leftDecor: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.95,
    marginTop: 2,
  },
  descriptionFull: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.95,
    marginTop: 8,
    textAlign: 'left',
  },
  actionContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 180,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
});
