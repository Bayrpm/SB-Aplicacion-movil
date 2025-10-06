import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function SignInScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.emoji}>🔐</ThemedText>
        <ThemedText style={styles.title}>Iniciar Sesión</ThemedText>
        <ThemedText style={styles.subtitle}>Próximamente</ThemedText>
        
        <View style={styles.infoBox}>
          <ThemedText style={styles.infoText}>
            Esta funcionalidad será implementada pronto.
          </ThemedText>
          <ThemedText style={styles.infoTextSmall}>
            Por ahora, puedes registrarte como nuevo usuario.
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 24,
    opacity: 0.7,
    marginBottom: 32,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoTextSmall: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
});
