import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
// Update the import path if the correct location is '@/components/TextInput'
import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { signInUser } from '../api/auth.api';

export function signInUserHandler(email: string, password: string) {
  return signInUser(email, password);

}

export default function SignInScreen() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>Correo electronico</ThemedText>
        <TextInput
          placeholder="Ingresa tu correo electronico"
          value={email}
          onChangeText={setEmail}
        />

        <ThemedText style={styles.title}>Contraseña</ThemedText>
        <TextInput
          placeholder="Ingresa tu contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity onPress={() => signInUserHandler(email, password)}>
          <ThemedText>Iniciar sesión</ThemedText>
        </TouchableOpacity>
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
