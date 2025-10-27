import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertPayload = {
  visible: boolean;
  title?: string;
  message?: string;
  buttons?: AlertButton[];
};

// listeners set for provider instances
const listeners = new Set<(p: AlertPayload) => void>();

/**
 * API compatible: Alert.alert(title, message)
 * Puedes importar { Alert } desde este modulo y llamar Alert.alert(...) si deseas.
 */
export const Alert = {
  alert(title?: string, message?: string, buttons?: AlertButton[]) {
    const payload: AlertPayload = { visible: true, title: title ?? 'Aviso', message: message ?? '', buttons };
    listeners.forEach((fn) => fn(payload));
  },
};

export default function AlertBox() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  // Colors adaptados al tema
  const backgroundColor = isDark ? '#0B0C0D' : '#FFFFFF';
  const titleColor = isDark ? '#E6EEF8' : '#0A4A90';
  const messageColor = isDark ? '#E6EEF8' : '#0F1724';
  const primaryColor = '#0A4A90';
  const transparentTextColor = isDark ? '#FFFFFF' : primaryColor;
  const [state, setState] = React.useState<AlertPayload>({ visible: false, title: '', message: '' });

  React.useEffect(() => {
    const cb = (p: AlertPayload) => setState(p);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  const onClose = () => setState({ visible: false, title: '', message: '', buttons: undefined });

  return (
    <Modal visible={state.visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.box, { backgroundColor, borderColor: primaryColor }]}> 
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>{state.title}</Text>
          <Text style={[styles.message, { color: messageColor }]}>{state.message}</Text>
          <View style={styles.buttonsRow}>
            {(state.buttons && state.buttons.length > 0 ? state.buttons : [{ text: 'Aceptar' }]).map((b, idx) => {
              const isDestructive = b.style === 'destructive';
              const isCancel = b.style === 'cancel';
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    try { b.onPress && b.onPress(); } catch (e) { console.error(e); }
                    onClose();
                  }}
                  activeOpacity={0.8}
                  style={isDestructive ? styles.buttonDestructive : isCancel ? [styles.buttonCancel, { borderColor: primaryColor }] : styles.button}
                >
                  <Text style={[
                    styles.buttonText,
                    // cancel/transparent text applied before destructive so destructive can override
                    isCancel ? [styles.buttonTextTransparent, { color: transparentTextColor }] : {},
                    isDestructive ? styles.buttonTextDestructive : {},
                  ]}>{b.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: 24,
  },
  box: {
    width: '90%',
    maxWidth: 520,
    borderRadius: 14,
    borderWidth: 2,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#0A4A90',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  buttonDestructive: {
    backgroundColor: '#FF3B30',
    borderWidth: 0,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: '#0A4A90',
    // keep same padding as filled button but transparent
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonTextDestructive: {
    color: '#ffffffff',  
  },
  // Text style for transparent buttons so they are visible on white background
  buttonTextTransparent: {
    color: '#0A4A90',
    fontWeight: '700',
    fontSize: 16,
  },
});
