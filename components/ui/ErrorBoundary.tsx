import { Button } from '@/components/Button';
import * as Updates from 'expo-updates';
import React from 'react';
import { DevSettings, StyleSheet, Text, View } from 'react-native';

type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<Record<string, unknown>>, State> {
  constructor(props: React.PropsWithChildren<Record<string, unknown>>) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // Log simple info to console; in producción/CI deberías enviar esto a un service (Sentry)
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Uncaught error', error, info);
  }

  reloadApp = async () => {
    try {
      // Prefer expo-updates reload for Expo managed apps
      if (Updates && typeof Updates.reloadAsync === 'function') {
        await Updates.reloadAsync();
        return;
      }
    } catch (e) {
      // fallthrough
    }

    try {
      // DevSettings.reload is available in RN dev environments
      if (DevSettings && typeof (DevSettings as any).reload === 'function') {
        (DevSettings as any).reload();
        return;
      }
    } catch (e) {
      // fallthrough
    }

    try {
      // Web fallback
      if (typeof (global as any).location?.reload === 'function') {
        (global as any).location.reload();
      }
    } catch (e) {
      // noop
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children as any;

    const message = this.state.error?.message || 'Ocurrió un error inesperado.';

    return (
      <View style={styles.wrapper}>
        <Text style={styles.title}>Error</Text>
        <Text style={styles.msg}>{message}</Text>
        <Button onPress={this.reloadApp} style={styles.btn}>Reiniciar app</Button>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  msg: { textAlign: 'center', marginBottom: 16, color: '#333' },
  btn: { minWidth: 160 },
});
