/**
 * error.tsx - Página de Error General
 * 
 * Muestra cuando ocurre un error inesperado en la aplicación
 * Expo Router automáticamente muestra esta página cuando hay errores
 */

import { Badge, Button, Card, ThemedText } from '@/app/shared/components';
import { useThemeColor } from '@/app/shared/hooks/use-theme-color';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorScreen({ error, reset }: ErrorBoundaryProps) {
  const backgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#000000' }, 'background');
  const lightBackgroundColor = useThemeColor({ light: '#F5F5F5', dark: '#1C1C1C' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const dangerColor = '#FF3B30';
  const primaryColor = useThemeColor({}, 'tint');
  const secondaryColor = '#5AC8FA';
  const [showDetails, setShowDetails] = useState(false);

  const errorMessage = error?.message || 'Error desconocido';
  const errorDigest = error?.digest || 'NO_DIGEST';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Contenido Principal */}
        <View style={styles.contentContainer}>
          {/* Icono de Error */}
          <View style={styles.iconContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
          </View>

          {/* Título */}
          <ThemedText type="title" style={styles.title}>
            ¡Algo salió mal!
          </ThemedText>

          {/* Descripción */}
          <ThemedText style={styles.description} type="subtitle">
            Se ha producido un error inesperado. Por favor, intenta nuevamente.
          </ThemedText>

          {/* Caja de error */}
          <Card style={{ marginBottom: 24 }}>
            <Text style={{ color: dangerColor, fontWeight: '600', marginBottom: 8 }}>Error Reportado:</Text>
            <Text style={{ color: dangerColor, fontWeight: '500' }}>
              {errorMessage}
            </Text>
          </Card>

          {/* Detalles adicionales */}
          {showDetails && (
            <View style={styles.detailsContainer}>
              <ThemedText style={[styles.errorLabel, { marginTop: 12 }]}>
                Código de Error:
              </ThemedText>
              <Badge variant="info" style={{ marginTop: 6 }}>
                {errorDigest}
              </Badge>

              <ThemedText style={[styles.errorLabel, { marginTop: 12 }]}>
                Stack Trace:
              </ThemedText>
              <Text style={[styles.stackTrace, { color: secondaryColor, backgroundColor: lightBackgroundColor }]}>
                {error?.stack || 'No disponible'}
              </Text>
            </View>
          )}

          {/* Botón para mostrar detalles */}
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setShowDetails(!showDetails)}
            style={styles.detailsButton}
          >
            {showDetails ? '▲ Ocultar detalles' : '▼ Mostrar detalles'}
          </Button>

          {/* Recomendaciones */}
          <View style={styles.recommendationsContainer}>
            <ThemedText type="subtitle" style={styles.recommendationsTitle}>
              📋 Pasos a seguir:
            </ThemedText>

            <View style={styles.recommendationsList}>
              <ThemedText style={styles.recommendationItem}>
                1. Intenta recargar la página
              </ThemedText>
              <ThemedText style={styles.recommendationItem}>
                2. Cierra y abre la aplicación nuevamente
              </ThemedText>
              <ThemedText style={styles.recommendationItem}>
                3. Verifica tu conexión a internet
              </ThemedText>
              <ThemedText style={styles.recommendationItem}>
                4. Contacta al equipo de soporte si el problema persiste
              </ThemedText>
            </View>
          </View>

          {/* Información de contacto */}
          <View style={[styles.supportBox, { backgroundColor: primaryColor + '10' }]}>
            <ThemedText style={styles.supportTitle}>
              📞 ¿Necesitas ayuda?
            </ThemedText>
            <ThemedText style={styles.supportText}>
              Si el problema persiste, por favor contacta al equipo de soporte con el código de error mostrado arriba.
            </ThemedText>
          </View>
        </View>

        {/* Botones de Acción */}
        <View style={styles.buttonsContainer}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={reset}
            style={styles.button}
          >
            🔄 Reintentar
          </Button>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => router.navigate('/(tabs)/citizen/citizenHome' as any)}
            style={styles.button}
          >
            🏠 Ir al Inicio
          </Button>

          <Button
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => router.back()}
            style={styles.button}
          >
            ← Regresar
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  contentContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: width * 0.3,
    height: width * 0.3,
    borderRadius: (width * 0.3) / 2,
  },
  errorIcon: {
    fontSize: 72,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsContainer: {
    marginTop: 12,
  },
  stackTrace: {
    fontSize: 10,
    lineHeight: 14,
    padding: 8,
    borderRadius: 6,
    fontFamily: 'monospace',
    marginTop: 8,
    maxHeight: 150,
  },
  detailsButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  recommendationsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  recommendationsList: {
    gap: 8,
  },
  recommendationItem: {
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 4,
  },
  supportBox: {
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 13,
    lineHeight: 18,
  },
  buttonsContainer: {
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  button: {
    marginVertical: 4,
  },
});
