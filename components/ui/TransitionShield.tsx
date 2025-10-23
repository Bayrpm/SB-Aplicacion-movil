import React from 'react';
import { Animated, StyleSheet } from 'react-native';

let controller: { show: (() => void) | null; hide: (() => void) | null } = { show: null, hide: null };

export function showTransitionShield() {
  controller.show?.();
}

export function hideTransitionShield() {
  controller.hide?.();
}

export default function TransitionShield() {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    controller.show = () => {
      setVisible(true);
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    };
    controller.hide = () => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setVisible(false));
    };
    return () => {
      controller.show = null;
      controller.hide = null;
    };
  }, [opacity]);

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, styles.container, { opacity }]} />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A4A90',
    zIndex: 10000,
  },
});
