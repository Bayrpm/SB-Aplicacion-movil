/**
 * EmptyState.tsx - Componente EmptyState reutilizable
 * 
 * Para mostrar cuando no hay datos disponibles
 * 
 * Ejemplos:
 * <EmptyState icon="📭" title="Sin datos" />
 * <EmptyState title="No hay reportes" message="Crea uno nuevo" action={{ label: "Crear", onPress: () => {} }} />
 */

import { useThemeColor } from '@/app/shared/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Button from './Button';

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  message?: string;
  action?: EmptyStateAction;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  messageStyle?: TextStyle;
}

/**
 * Componente EmptyState reusable
 * @example
 * <EmptyState 
 *   title="No hay reportes"
 *   message="Crea uno nuevo para empezar"
 *   action={{ label: "Crear", onPress: handleCreate }}
 * />
 */
export const EmptyState = React.forwardRef<View, EmptyStateProps>(
  (
    {
      icon = '📭',
      title,
      message,
      action,
      style,
      titleStyle,
      messageStyle,
    },
    ref
  ) => {
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');

    return (
      <View
        ref={ref}
        style={[styles.container, style]}
      >
        {typeof icon === 'string' ? (
          <Text style={styles.iconText}>{icon}</Text>
        ) : (
          <View style={styles.iconContainer}>{icon}</View>
        )}

        <Text
          style={[
            styles.title,
            { color: textColor },
            titleStyle,
          ]}
        >
          {title}
        </Text>

        {message && (
          <Text
            style={[
              styles.message,
              { color: mutedColor },
              messageStyle,
            ]}
          >
            {message}
          </Text>
        )}

        {action && (
          <Button
            variant={action.variant || 'primary'}
            size="md"
            onPress={action.onPress}
            style={styles.action}
          >
            {action.label}
          </Button>
        )}
      </View>
    );
  }
);

EmptyState.displayName = 'EmptyState';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 60,
    gap: 12,
  },
  iconText: {
    fontSize: 64,
    marginBottom: 12,
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  action: {
    marginTop: 8,
  },
});

export default EmptyState;
