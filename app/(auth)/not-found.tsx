/**
 * NotFound.tsx - Página 404 NotFound
 * 
 * Muestra cuando un usuario intenta acceder a una ruta que no existe
 */

import { Button, Card, ThemedText } from '@/app/shared/components';
import { useThemeColor } from '@/app/shared/hooks/use-theme-color';
import { router } from 'expo-router';
import React from 'react';
import { Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function NotFoundScreen() {
  const backgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#000000' }, 'background');
  const primaryColor = useThemeColor({}, 'tint');
  const lightBackgroundColor = useThemeColor({ light: '#F5F5F5', dark: '#1C1C1C' }, 'background');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Contenido Principal */}
        <View style={styles.contentContainer}>
          {/* Icono 404 */}
          <View style={styles.iconContainer}>
            <Text style={[styles.largeText, { color: primaryColor }]}>404</Text>
          </View>

          {/* Título */}
          <ThemedText type="title" style={styles.title}>
            Página No Encontrada
          </ThemedText>

          {/* Descripción */}
          <ThemedText style={styles.description} type="subtitle">
            Lo sentimos, la página que buscas no existe o ha sido movida.
          </ThemedText>

          {/* Mensaje detallado */}
          <Card style={styles.messageBox}>
            <Text style={styles.messageText}>
              🔍 La ruta no fue encontrada en nuestra aplicación. Verifica la URL e intenta nuevamente.
            </Text>
          </Card>

          {/* Sugerencias */}
          <View style={styles.suggestionsContainer}>
            <ThemedText type="subtitle" style={styles.suggestionsTitle}>
              Acciones sugeridas:
            </ThemedText>

            <View style={styles.suggestionsList}>
              <ThemedText style={styles.suggestionItem}>
                • Regresa a la pantalla anterior
              </ThemedText>
              <ThemedText style={styles.suggestionItem}>
                • Ve al inicio de la aplicación
              </ThemedText>
              <ThemedText style={styles.suggestionItem}>
                • Revisa tu conexión a internet
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Botones de Acción */}
        <View style={styles.buttonsContainer}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.back()}
            style={styles.button}
          >
            ← Ir Atrás
          </Button>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => router.navigate('/(tabs)/citizen/citizenHome' as any)}
            style={styles.button}
          >
            🏠 Inicio
          </Button>

          <Button
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => router.navigate('/(auth)/index' as any)}
            style={styles.button}
          >
            🔄 Reintentar
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
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: (width * 0.4) / 2,
  },
  largeText: {
    fontSize: 80,
    fontWeight: 'bold',
    letterSpacing: -2,
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
  messageBox: {
    marginBottom: 24,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  suggestionsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  suggestionsList: {
    gap: 8,
  },
  suggestionItem: {
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 4,
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
