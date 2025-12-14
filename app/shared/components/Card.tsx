/**
 * Card.tsx - Componente Card reutilizable
 * 
 * Componente contenedor versátil para contenido con bordes y sombra
 * 
 * Ejemplos:
 * <Card>Contenido simple</Card>
 * <Card variant="elevated">Con sombra</Card>
 * <Card variant="outlined">Con borde</Card>
 * <Card header="Título">Contenido con encabezado</Card>
 */

import { useThemeColor } from '@/app/shared/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

export type CardVariant = 'filled' | 'elevated' | 'outlined';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  header?: string | React.ReactNode;
  footer?: string | React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  headerStyle?: TextStyle;
  footerStyle?: TextStyle;
  onPress?: () => void;
}

/**
 * Componente Card reusable
 * @example
 * <Card header="Información">
 *   <Text>Contenido de la tarjeta</Text>
 * </Card>
 */
export const Card = React.forwardRef<View, CardProps>(
  (
    {
      children,
      variant = 'filled',
      header,
      footer,
      style,
      contentStyle,
      headerStyle,
      footerStyle,
      onPress,
    },
    ref
  ) => {
    const backgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1C' }, 'background');
    const borderColor = useThemeColor({ light: '#E5E5E5', dark: '#333333' }, 'background');
    const textColor = useThemeColor({}, 'text');

    const variantStyles: Record<CardVariant, ViewStyle> = {
      filled: {
        backgroundColor,
      },
      elevated: {
        backgroundColor,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
      outlined: {
        backgroundColor,
        borderWidth: 1,
        borderColor: borderColor,
      },
    };

    return (
      <View
        ref={ref}
        style={[
          styles.container,
          variantStyles[variant],
          style,
        ]}
      >
        {header && (
          <View style={styles.header}>
            {typeof header === 'string' ? (
              <Text style={[styles.headerText, { color: textColor }, headerStyle]}>
                {header}
              </Text>
            ) : (
              header
            )}
          </View>
        )}

        <View style={[styles.content, contentStyle]}>
          {children}
        </View>

        {footer && (
          <View style={styles.footer}>
            {typeof footer === 'string' ? (
              <Text style={[styles.footerText, { color: textColor }, footerStyle]}>
                {footer}
              </Text>
            ) : (
              footer
            )}
          </View>
        )}
      </View>
    );
  }
);

Card.displayName = 'Card';

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default Card;
