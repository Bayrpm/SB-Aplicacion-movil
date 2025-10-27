// supabase.ts (el mismo archivo donde lo tienes)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Limpia cualquier rastro de sesión en Supabase + AsyncStorage.
 * Hace signOut, detiene el autoRefresh y borra claves relacionadas con auth.
 */
export async function clearAuthSession() {
  try {
    // Intenta cerrar sesión en el servidor
    await supabase.auth.signOut();
  } catch (e) {
    // noop
  }

  try {
    supabase.auth.stopAutoRefresh();
  } catch (e) {}

  try {
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter((k) => /supabase|session|refresh|auth|token/i.test(k));
    if (authKeys.length) {
      await AsyncStorage.multiRemove(authKeys);
    }
    return { removed: authKeys };
  } catch (e) {
    return { removed: [] };
  }
}

async function handleAppState(state: string) {
  if (state === 'active') {
    try {
      // Ver si hay sesión y refresh_token antes de arrancar el auto-refresh
      const { data } = await supabase.auth.getSession();
      const hasRefresh = !!data?.session?.refresh_token;

      if (hasRefresh) {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
        // Limpia la sesión local para cortar el loop de "Invalid Refresh Token"
        try {
          // si tu versión soporta scope:'local'
          await supabase.auth.signOut({ scope: 'local' } as any);
        } catch {
          // fallback compatible
          await supabase.auth.signOut();
        }
      }
    } catch {
      supabase.auth.stopAutoRefresh();
    }
  } else {
    supabase.auth.stopAutoRefresh();
  }
}

// Ejecuta una vez al cargar (cubre el arranque de la app)
handleAppState('active');

// Suscripción simple al estado de la app
AppState.addEventListener('change', handleAppState);

export default supabase;
