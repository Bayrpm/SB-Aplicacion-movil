// supabase.ts (el mismo archivo donde lo tienes)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
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
    // Intentar eliminar únicamente el token de notificaciones del dispositivo actual
    // (no borrar tokens de otros dispositivos del mismo usuario)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const deviceId = Constants.sessionId || 'unknown-device';
        try {
          // Eliminar filas que coincidan con usuario_id + device_id (dispositivo actual)
          await supabase.from('tokens_push').delete().eq('usuario_id', user.id).eq('device_id', deviceId);
        } catch (e) {
          // noop: no bloquear el signOut por fallo al eliminar token por device_id
        }

        // Intentar también eliminar por expo_token local si está disponible
        try {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;
          const tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
          const expoToken = tokenResult?.data ?? null;
          if (expoToken) {
            try {
              await supabase.from('tokens_push').delete().eq('usuario_id', user.id).eq('expo_token', expoToken);
            } catch (e) {
              // noop
            }
          }
        } catch (e) {
          // noop - no todos los entornos podrán resolver el token
        }
      }
    } catch (e) {
      // noop - no bloquear la signOut si falla obtener usuario
    }

    // Finalmente cerrar la sesión en Supabase
    try {
      // Intentar signOut con alcance global si la SDK lo soporta.
      // Nota: dependiendo de la versión de supabase-js esto puede o no aceptar la opción { global: true }.
      // Si no está soportado, fallback a signOut() simple.
      try {
        // @ts-ignore: some supabase-js versions accept { global: true }
        const maybe = await supabase.auth.signOut({ global: true } as any);
        // Si la llamada falla de forma controlada, el catch inferior manejará el fallback
      } catch (inner) {
        try {
          await supabase.auth.signOut();
        } catch (_) {
          // noop
        }
      }
    } catch (e) {
      // noop
    }
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
