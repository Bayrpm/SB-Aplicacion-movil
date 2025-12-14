/**
 * Loader.tsx - Componente Loader/Spinner reutilizable
 * 
 * Componente para mostrar estado de carga
 * 
 * Ejemplos:
 * <Loader />
 * <Loader size="lg" color="primary" />
 * <Loader message="Cargando..." />
 */

import { useThemeColor } from '@/app/shared/hooks/use-theme-color';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';

export type LoaderSize = 'sm' | 'md' | 'lg';
export type LoaderVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning';

const SIZE_MAP: Record<LoaderSize, 'small' | 'large'> = {
  sm: 'small',
  md: 'large',
  lg: 'large',
};

const SIZE_PIXEL_MAP: Record<LoaderSize, number> = {
  sm: 20,
  md: 40,
  lg: 60,
};

export interface LoaderProps {
  size?: LoaderSize;
  color?: string;
  variant?: LoaderVariant;
  message?: string;
  overlay?: boolean;
  style?: ViewStyle;
}

/**
 * Componente Loader reusable
 * @example
 * <Loader message="Procesando..." />
 * <Loader variant="primary" size="lg" />
 */
export const Loader = React.forwardRef<View, LoaderProps>(
  (
    {
      size = 'md',
      color,
      variant = 'primary',
      message,
      overlay = false,
      style,
    },
    ref
  ) => {
    const tintColor = useThemeColor({}, 'tint');
    const textColor = useThemeColor({}, 'text');

    const variantColors: Record<LoaderVariant, string> = {
      primary: color || tintColor,
      secondary: color || '#5AC8FA',
      success: color || '#34C759',
      danger: color || '#FF3B30',
      warning: color || '#FF9500',
    };

    const loaderColor = variantColors[variant];

    if (overlay) {
      return (
        <View
          ref={ref}
          style={[styles.overlay, style]}
        >
          <View style={styles.loaderContent}>
            <ActivityIndicator
              size={SIZE_MAP[size]}
              color={loaderColor}
            />
            {message && (
              <Text style={[styles.message, { color: textColor }]}>
                {message}
              </Text>
            )}
          </View>
        </View>
      );
    }

    return (
      <View
        ref={ref}
        style={[styles.container, style]}
      >
        <ActivityIndicator
          size={SIZE_MAP[size]}
          color={loaderColor}
        />
        {message && (
          <Text style={[styles.message, { color: textColor }]}>
            {message}
          </Text>
        )}
      </View>
    );
  }
);

Loader.displayName = 'Loader';

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loaderContent: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 32,
    gap: 12,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
});

export default Loader;
