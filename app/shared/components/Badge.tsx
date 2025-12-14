/**
 * Badge.tsx - Componente Badge reutilizable
 * 
 * Componente para mostrar etiquetas, estados, contadores, etc.
 * 
 * Ejemplos:
 * <Badge>Activo</Badge>
 * <Badge variant="success">Completado</Badge>
 * <Badge variant="danger">Rechazado</Badge>
 * <Badge count={5}>Pendientes</Badge>
 */

import { useThemeColor } from '@/app/shared/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

export type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  count?: number;
  backgroundColor?: string;
  textColor?: string;
}

/**
 * Componente Badge reusable
 * @example
 * <Badge variant="success">Aprobado</Badge>
 * <Badge variant="danger" count={3}>Errores</Badge>
 */
export const Badge = React.forwardRef<View, BadgeProps>(
  (
    {
      children,
      variant = 'default',
      style,
      textStyle,
      count,
      backgroundColor,
      textColor,
    },
    ref
  ) => {
    const tintColor = useThemeColor({}, 'tint');
    const textColorTheme = useThemeColor({}, 'text');
    const backgroundColor_theme = useThemeColor({ light: '#F5F5F5', dark: '#333333' }, 'background');

    const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
      default: { bg: backgroundColor_theme, text: textColorTheme },
      success: { bg: '#34C759', text: '#FFFFFF' },
      danger: { bg: '#FF3B30', text: '#FFFFFF' },
      warning: { bg: '#FF9500', text: '#FFFFFF' },
      info: { bg: '#5AC8FA', text: '#FFFFFF' },
      neutral: { bg: '#CCCCCC', text: '#000000' },
    };

    const colors = variantColors[variant];
    const bgColor = backgroundColor || colors.bg;
    const tColor = textColor || colors.text;

    return (
      <View
        ref={ref}
        style={[
          styles.container,
          { backgroundColor: bgColor },
          style,
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: tColor },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {children}
        </Text>
        {count !== undefined && count > 0 && (
          <View style={[styles.count, { backgroundColor: tColor }]}>
            <Text style={[styles.countText, { color: bgColor }]}>
              {count}
            </Text>
          </View>
        )}
      </View>
    );
  }
);

Badge.displayName = 'Badge';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  count: {
    marginLeft: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default Badge;
