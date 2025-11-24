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
      const hasSession = !!data?.session;
      const hasRefresh = !!data?.session?.refresh_token;

      console.log('[Supabase] handleAppState - active:', { hasSession, hasRefresh });

      if (hasSession && hasRefresh) {
        supabase.auth.startAutoRefresh();
      } else if (hasSession && !hasRefresh) {
        // Tiene sesión pero no refresh token - NO cerrar sesión automáticamente
        // Esto puede pasar durante operaciones normales
        console.log('[Supabase] ⚠️ Sesión sin refresh_token - manteniendo sesión activa');
        supabase.auth.stopAutoRefresh();
      } else {
        // No hay sesión en absoluto - solo detener auto-refresh
        console.log('[Supabase] No hay sesión activa');
        supabase.auth.stopAutoRefresh();
      }
    } catch (error) {
      console.log('[Supabase] Error en handleAppState:', error);
      supabase.auth.stopAutoRefresh();
    }
  } else {
    console.log('[Supabase] handleAppState - inactive/background');
    supabase.auth.stopAutoRefresh();
  }
}

// Ejecuta una vez al cargar (cubre el arranque de la app)
handleAppState('active');

// Suscripción simple al estado de la app
AppState.addEventListener('change', handleAppState);

export default supabase;
