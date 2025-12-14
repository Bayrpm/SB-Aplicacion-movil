/**
 * Divider.tsx - Componente Divider reutilizable
 * 
 * Componente para separar secciones de contenido
 * 
 * Ejemplos:
 * <Divider />
 * <Divider variant="dashed" />
 * <Divider label="O" />
 */

import { useThemeColor } from '@/app/shared/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

export type DividerVariant = 'solid' | 'dashed' | 'dotted';
export type DividerOrientation = 'horizontal' | 'vertical';

export interface DividerProps {
  variant?: DividerVariant;
  orientation?: DividerOrientation;
  label?: string;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  color?: string;
}

/**
 * Componente Divider reusable
 * @example
 * <View>
 *   <Text>Sección 1</Text>
 *   <Divider />
 *   <Text>Sección 2</Text>
 * </View>
 */
export const Divider = React.forwardRef<View, DividerProps>(
  (
    {
      variant = 'solid',
      orientation = 'horizontal',
      label,
      style,
      labelStyle,
      color,
    },
    ref
  ) => {
    const defaultColor = useThemeColor({ light: '#E5E5E5', dark: '#333333' }, 'background');
    const dividerColor = color || defaultColor;
    const textColor = useThemeColor({}, 'text');

    const variantStyles: Record<DividerVariant, ViewStyle> = {
      solid: { borderWidth: 0 },
      dashed: { borderWidth: 1, borderStyle: 'dashed' },
      dotted: { borderWidth: 1, borderStyle: 'dotted' },
    };

    if (orientation === 'vertical') {
      return (
        <View
          ref={ref}
          style={[
            styles.verticalContainer,
            { borderRightColor: dividerColor },
            variantStyles[variant],
            style,
          ]}
        />
      );
    }

    // Horizontal with label
    if (label) {
      return (
        <View
          ref={ref}
          style={[styles.labeledContainer, style]}
        >
          <View style={[styles.line, { backgroundColor: dividerColor }]} />
          <Text style={[styles.label, { color: textColor }, labelStyle]}>
            {label}
          </Text>
          <View style={[styles.line, { backgroundColor: dividerColor }]} />
        </View>
      );
    }

    // Simple horizontal line
    return (
      <View
        ref={ref}
        style={[
          styles.horizontalLine,
          {
            borderBottomColor: dividerColor,
            borderBottomWidth: variant === 'solid' ? 1 : 0,
          },
          variantStyles[variant],
          style,
        ]}
      />
    );
  }
);

Divider.displayName = 'Divider';

const styles = StyleSheet.create({
  horizontalLine: {
    height: 1,
    width: '100%',
  },
  verticalContainer: {
    width: 1,
    flex: 1,
  },
  labeledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  line: {
    flex: 1,
    height: 1,
  },
  label: {
    marginHorizontal: 12,
    fontSize: 13,
    fontWeight: '500',
  },
});

export default Divider;
