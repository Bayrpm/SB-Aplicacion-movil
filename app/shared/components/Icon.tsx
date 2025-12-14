/**
 * Icon.tsx - Componente Icon reutilizable
 * 
 * Componente wrapper para iconos que soporta múltiples fuentes
 * Integra con IconSymbol del proyecto
 * 
 * Ejemplos:
 * <Icon name="heart" size={24} color="red" />
 * <Icon name="check-circle" variant="success" />
 * <Icon name="alert" variant="danger" size="lg" />
 */

import { IconSymbol } from '@/app/shared/components/ui/icon-symbol';
import { useThemeColor } from '@/app/shared/hooks/use-theme-color';
import React from 'react';
import { View, ViewStyle } from 'react-native';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type IconVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'muted';

const ICON_SIZE_MAP: Record<IconSize, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
};

export interface IconProps {
  name: string;
  size?: IconSize | number;
  color?: string;
  variant?: IconVariant;
  style?: ViewStyle;
  backgroundColor?: string;
  rounded?: boolean;
  padding?: number;
}

/**
 * Componente Icon reusable
 * @example
 * <Icon name="check-circle" variant="success" size="lg" />
 * <Icon name="alert" variant="danger" />
 */
export const Icon = React.forwardRef<View, IconProps>(
  (
    {
      name,
      size = 'md',
      color,
      variant = 'default',
      style,
      backgroundColor,
      rounded = false,
      padding = 0,
    },
    ref
  ) => {
    const tintColor = useThemeColor({}, 'tint');
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');

    const variantColors: Record<IconVariant, string> = {
      default: color || textColor,
      success: color || '#34C759',
      danger: color || '#FF3B30',
      warning: color || '#FF9500',
      info: color || '#5AC8FA',
      muted: color || mutedColor,
    };

    const iconColor = variantColors[variant];
    const iconSize = typeof size === 'number' ? size : ICON_SIZE_MAP[size];
    const hasBackground = backgroundColor || rounded;
    const containerSize = iconSize + (padding * 2);

    return (
      <View
        ref={ref}
        style={[
          hasBackground && {
            width: containerSize,
            height: containerSize,
            borderRadius: rounded ? containerSize / 2 : 8,
            backgroundColor: backgroundColor || '#F5F5F5',
            justifyContent: 'center',
            alignItems: 'center',
          },
          style,
        ]}
      >
        <IconSymbol
          name={name as any}
          size={iconSize}
          color={iconColor}
        />
      </View>
    );
  }
);

Icon.displayName = 'Icon';

export default Icon;
