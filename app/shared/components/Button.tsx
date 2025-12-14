/**
 * Button.tsx - Componente Button reusable y flexible
 * 
 * Soporta múltiples variantes:
 * - variants: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline'
 * - sizes: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * - shapes: 'rounded' | 'square' | 'circle' | 'pill'
 * - states: normal, disabled, loading
 * 
 * Ejemplos de uso:
 * <Button>Texto simple</Button>
 * <Button variant="primary" size="lg">Botón grande</Button>
 * <Button variant="danger" size="md" shape="pill">Eliminar</Button>
 * <Button disabled>Deshabilitado</Button>
 * <Button loading>Cargando...</Button>
 */

import { useThemeColor } from '@/app/shared/hooks/use-theme-color';
import React, { useMemo } from 'react';
import { AccessibilityProps, ActivityIndicator, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

// ============================================================================
// TIPOS
// ============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ButtonShape = 'rounded' | 'square' | 'circle' | 'pill';

export interface ButtonProps extends AccessibilityProps {
  /** Texto o contenido del botón */
  children?: React.ReactNode;

  /** Variante de color/estilo */
  variant?: ButtonVariant;

  /** Tamaño del botón */
  size?: ButtonSize;

  /** Forma del botón */
  shape?: ButtonShape;

  /** Callback cuando se presiona el botón */
  onPress?: () => void | Promise<void>;

  /** Desabilitar el botón */
  disabled?: boolean;

  /** Mostrar indicador de carga */
  loading?: boolean;

  /** Expandir a ancho completo */
  fullWidth?: boolean;

  /** Estilos personalizados del contenedor */
  style?: ViewStyle;

  /** Estilos personalizados del texto */
  textStyle?: TextStyle;

  /** Color de carga personalizado */
  loadingColor?: string;

  /** Icono (izquierda) - renderiza antes del texto */
  iconLeft?: React.ReactNode;

  /** Icono (derecha) - renderiza después del texto */
  iconRight?: React.ReactNode;

  /** Activo (para toggle buttons) */
  active?: boolean;
}

// ============================================================================
// COMPONENTE BUTTON
// ============================================================================

export const Button = React.forwardRef<any, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      shape = 'rounded',
      onPress,
      disabled = false,
      loading = false,
      fullWidth = false,
      style,
      textStyle,
      loadingColor,
      iconLeft,
      iconRight,
      active = false,
      ...accessibilityProps
    },
    ref
  ) => {
    const primaryColor = useThemeColor({}, 'tint');
    const textColor = useThemeColor({}, 'text');
    const backgroundColor = useThemeColor({ light: '#F5F5F5', dark: '#333333' }, 'background');
    const successColor = '#34C759';
    const dangerColor = '#FF3B30';
    const warningColor = '#FF9500';
    const disabledColor = '#CCCCCC';

    const colors = {
      primary: primaryColor,
      secondary: '#5AC8FA',
      success: successColor,
      danger: dangerColor,
      warning: warningColor,
      text: textColor,
      background: backgroundColor,
      card: backgroundColor,
      surface: '#FFFFFF',
      disabled: disabledColor,
      disabledText: '#666666',
    };

    // Determinar si el botón está deshabilitado
    const isDisabled = disabled || loading;

    // Obtener estilos dinámicamente
    const dynamicStyles = useMemo(() => {
      return getButtonStyles(variant, size, shape, isDisabled, fullWidth, colors, active);
    }, [variant, size, shape, isDisabled, fullWidth, colors, active]);

    return (
      <TouchableOpacity
        ref={ref}
        onPress={onPress}
        disabled={isDisabled}
        style={[dynamicStyles.container, style]}
        activeOpacity={isDisabled ? 1 : 0.7}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        {...accessibilityProps}
      >
        {/* Contenido: Ícono izquierda + Texto + Ícono derecha */}
        <React.Fragment>
          {iconLeft && !loading && <React.Fragment>{iconLeft}</React.Fragment>}

          {loading ? (
            <ActivityIndicator
              size="small"
              color={loadingColor || dynamicStyles.text.color}
            />
          ) : (
            <>
              {typeof children === 'string' ? (
                <Text style={[dynamicStyles.text, textStyle]} numberOfLines={1}>
                  {children}
                </Text>
              ) : (
                children
              )}
            </>
          )}

          {iconRight && !loading && <React.Fragment>{iconRight}</React.Fragment>}
        </React.Fragment>
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

// ============================================================================
// ESTILOS DINÁMICOS
// ============================================================================

interface ButtonStyles {
  container: ViewStyle;
  text: TextStyle;
}

function getButtonStyles(
  variant: ButtonVariant,
  size: ButtonSize,
  shape: ButtonShape,
  disabled: boolean,
  fullWidth: boolean,
  colors: any,
  active: boolean
): ButtonStyles {
  // Base styles
  const baseContainer: ViewStyle = {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  };

  // Tamaño
  const sizeStyles: Record<ButtonSize, ViewStyle> = {
    xs: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      minHeight: 28,
    },
    sm: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      minHeight: 32,
    },
    md: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      minHeight: 40,
    },
    lg: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      minHeight: 48,
    },
    xl: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      minHeight: 56,
    },
  };

  // Forma
  const shapeStyles: Record<ButtonShape, ViewStyle> = {
    rounded: { borderRadius: 8 },
    square: { borderRadius: 0 },
    circle: { borderRadius: 999, paddingHorizontal: sizeStyles[size].paddingVertical },
    pill: { borderRadius: 999 },
  };

  // Variantes de color
  const variantStyles: Record<ButtonVariant, { background: string; text: string; border?: string }> = {
    primary: { background: colors.primary, text: colors.surface },
    secondary: { background: colors.secondary, text: colors.surface },
    success: { background: colors.success, text: colors.surface },
    danger: { background: colors.danger, text: colors.surface },
    warning: { background: colors.warning, text: colors.surface },
    outline: { background: 'transparent', text: colors.primary, border: colors.primary },
    ghost: { background: colors.card, text: colors.text },
  };

  const variantColor = variantStyles[variant];

  // Combinar estilos
  const container: ViewStyle = {
    ...baseContainer,
    ...sizeStyles[size],
    ...shapeStyles[shape],
    backgroundColor: disabled ? colors.disabled : variantColor.background,
    borderColor: variantColor.border,
    ...(variantColor.border && { borderWidth: 1 }),
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.6 : 1,
  };

  const text: TextStyle = {
    color: disabled ? colors.disabledText : variantColor.text,
    fontSize: 14,
    fontWeight: variant === 'outline' || variant === 'ghost' ? '500' : '600',
    textAlign: 'center',
  };

  return { container, text };
}

export default Button;
