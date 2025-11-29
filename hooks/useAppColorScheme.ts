import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

// ===== Estado global (singleton por módulo) =====
let currentMode: ThemeMode = 'light';
let currentScheme: ColorSchemeName = 'light';
const listeners = new Set<(scheme: ColorSchemeName) => void>();
let loaded = false;
let systemSub: { remove: () => void } | null = null;

const notify = () => {
  for (const cb of Array.from(listeners)) {
    try { cb(currentScheme); } catch {}
  }
};

const ensureSystemSubscription = () => {
  // Ensure we have a single subscription to system changes. The callback
  // will only notify consumers when the app theme mode is 'system'. Keeping
  // the subscription active avoids timing issues where the listener wasn't
  // registered and a system change was missed (requiring an app restart).
  if (!systemSub) {
    systemSub = Appearance.addChangeListener(({ colorScheme }) => {
      // Only update and notify when the app is configured to follow system
      if (currentMode === 'system') {
        currentScheme = colorScheme;
        notify();
      } else {
        // keep currentScheme in sync for completeness, but don't notify
        currentScheme = currentMode as ColorSchemeName;
      }
    });
  }
  // If the app is not following the system, we still keep the listener
  // attached but we won't notify listeners until the mode is switched to
  // 'system'. This avoids missing an event between mounting and registration.
};

const loadPersistedOnce = async () => {
  if (loaded) return;
  loaded = true;
  try {
    const saved = await AsyncStorage.getItem('@theme_mode');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      currentMode = saved;
      currentScheme = saved === 'system' ? Appearance.getColorScheme() : saved;
      ensureSystemSubscription();
      notify();
    }
  } catch {}
};

export const setAppThemeMode = async (mode: ThemeMode) => {
  try { await AsyncStorage.setItem('@theme_mode', mode); } catch {}
  currentMode = mode;
  currentScheme = mode === 'system' ? Appearance.getColorScheme() : mode;
  ensureSystemSubscription();
  notify();
};

export function useAppColorScheme(): [ColorSchemeName, (mode: ThemeMode) => Promise<void>] {
  const [scheme, setScheme] = useState<ColorSchemeName>(currentScheme);

  useEffect(() => {
    // Cargar persistido una sola vez
    void loadPersistedOnce();
    // Suscribirse a cambios globales
    const cb = (s: ColorSchemeName) => setScheme(s);
    listeners.add(cb);
    // Emitir estado actual por si cambió antes del mount
    setScheme(currentScheme);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  // Setter vinculado al global
  const setMode = useCallback(async (mode: ThemeMode) => {
    await setAppThemeMode(mode);
  }, []);

  return [scheme, setMode];
}
