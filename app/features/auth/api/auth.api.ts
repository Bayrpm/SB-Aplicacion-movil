import { supabase } from '@/app/shared/lib/supabase';
import React from 'react';

/**
 * Normaliza y traduce mensajes de error retornados por Supabase/Auth a español.
 * Retorna siempre un mensaje en español (fallback: mensaje genérico en español).
 */
export function mapSupabaseErrorMessage(errorMessage?: string | null): string {
  const msg = (errorMessage || '').toLowerCase();
  if (!msg) return 'Ocurrió un error. Intenta de nuevo.';

  if (msg.includes('user already registered') || msg.includes('already been registered') || msg.includes('email address is already registered') || msg.includes('already registered')) {
    return 'Este email ya está registrado. Intenta iniciar sesión en su lugar.';
  }

  if (msg.includes('invalid email') || msg.includes('invalid email address')) {
    return 'El formato del email no es válido.';
  }

  if (msg.includes('password should be at least') || msg.includes('password must be at least') || msg.includes('at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials') || msg.includes('invalid password') || msg.includes('invalid password')) {
    return 'Se han ingresado credenciales incorrectas.';
  }

  if (msg.includes('network') || msg.includes('timeout') || msg.includes('failed to fetch')) {
    return 'Error de red. Por favor verifica tu conexión e intenta de nuevo.';
  }

  // Mensaje por defecto: devolvemos una versión en español para no exponer texto en inglés
  return 'Ocurrió un error. Intenta de nuevo.';
}
// NOTA: Se recomienda migrar la columna email a CITEXT + UNIQUE en la base de datos para unicidad y comparación case-insensitive.
// Se elimina el pre-chequeo de email antes de signUp. El error se maneja en signUpUser.

/**
 * Registra un nuevo usuario en Supabase Auth con metadatos
 */
export async function signUpUser(email: string, password: string, userData?: {
  nombre?: string;
  apellido?: string;
  telefono?: string;
}) {
  // Estandarizar email a lowercase
  const metadataToSend = {
    name: userData?.nombre || '',
    last_name: userData?.apellido || '',
    phone: userData?.telefono || ''
  };

  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase(),
    password,
    options: {
      data: metadataToSend
    }
  });

  if (error) {
    // Normalizar y traducir mensaje de error a español
    const translated = mapSupabaseErrorMessage(error.message);
    return { data: null, error: { message: translated }, user: null, session: null };
  }

  return { data, error: null, user: data.user, session: data.session };
}
/**
 
Inicia sesión con email y contraseña
*/
export async function signInUser(email: string, password: string) {
  // Si no se envía contraseña (step 1), sólo comprobamos existencia del email
  if (!password) {
    try {
      const emailNorm = email?.toLowerCase?.() ?? email;
      // Intentar validar existencia usando la tabla de perfiles (si existe)
      const { data: profileByEmail, error: profileByEmailError } = await supabase
        .from('perfiles_ciudadanos')
        .select('usuario_id, email')
        .ilike('email', emailNorm)
        .maybeSingle();

      if (profileByEmailError) {
        return { profile: null, isInspector: false, error: profileByEmailError, session: null, user: null, exists: false };
      }

      const exists = !!profileByEmail;
      return { profile: null, isInspector: false, error: null, session: null, user: null, exists };
    } catch (e) {
      return { profile: null, isInspector: false, error: e as any, session: null, user: null, exists: false };
    }
  }

  // 1) Intentar autenticar con supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Si hay un error de autenticación, normalizar el mensaje y retornarlo en español
  if (error) {
    const translated = mapSupabaseErrorMessage(error.message);
    return { profile: null, isInspector: false, error: { message: translated }, session: data?.session ?? null, user: data?.user ?? null };
  }

  const userId = data?.user?.id;

  // Si no hay usuario en la respuesta, retornamos sin profile
  if (!userId) {
    return { profile: null, isInspector: false, error: null, session: data?.session ?? null, user: data?.user ?? null };
  }

  try {
    // Consulta simple del perfil (sin embed ambiguo)
    const { data: profile, error: profileError } = await supabase
      .from('perfiles_ciudadanos')
      .select('*')
      .eq('usuario_id', userId)
      .maybeSingle();

    // Consulta existencia booleana de inspector
    const { data: inspectorData, error: inspectorError } = await supabase
      .from('inspectores')
      .select('id')
      .eq('usuario_id', userId)
      .limit(1)
      .maybeSingle();

    const isInspector = !!inspectorData;
    const combinedError = profileError ?? inspectorError ?? null;

    return { profile: profile ?? null, isInspector, error: combinedError, session: data?.session ?? null, user: data?.user ?? null, exists: true };
  } catch (e) {
    return { profile: null, isInspector: false, error: e as any, session: data?.session ?? null, user: data?.user ?? null, exists: true };
  }
}


/**
 * Comprueba si un usuario (por id) está marcado como inspector en la tabla `inspectores`.
 * Devuelve true si existe al menos un registro en la tabla inspectores para ese usuario.
 */
export async function isUserInspector(userId: string): Promise<boolean> {
  if (!userId) return false;
  // 1) Intento via RPC (ignora RLS si existe la función)
  try {
    const rpc = await supabase.rpc('is_inspector', { p_user_id: userId });
    if (!rpc.error && typeof rpc.data === 'boolean') {
      return rpc.data;
    }
  } catch { }
  // 2) Fallback: existencia booleana con .maybeSingle()
  try {
    const { data, error } = await supabase
      .from('inspectores')
      .select('id')
      .eq('usuario_id', userId)
      .limit(1)
      .maybeSingle();
    if (error) {
      return false;
    }
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Cierra la sesión del usuario
 */
export async function signOut() {
  try {
    // Intentar eliminar token de notificaciones asociado al usuario/dispositivo
    // antes de limpiar la sesión. Import dinámico para evitar ciclos de dependencia.
    try {
      const svc = await import('@/app/services/notificationService');
      if (svc && typeof svc.unregisterPushNotifications === 'function') {
        await svc.unregisterPushNotifications();
      }
    } catch (e) {
      // No fatal: seguimos con el signOut aunque falle el borrado de token
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.debug('unregisterPushNotifications falló:', e);
    }

    // Intenta sign out "completo" usando helper que además limpia AsyncStorage
    // importamos dinámicamente para evitar ciclos de dependencia
    const mod = await import('@/app/shared/lib/supabase');
    if (mod && mod.clearAuthSession) {
      const res = await mod.clearAuthSession();
      return { error: null, removedKeys: res.removed };
    }
  } catch (e) {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err) {
      return { error: err };
    }
  }
  return { error: null };
}


export default function AuthApiRoute(): React.ReactElement | null {
  return null;
}

