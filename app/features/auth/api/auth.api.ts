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
/**
 * Verifica si un email ya está registrado verificando en la tabla de perfiles
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('perfiles_ciudadanos')
    .select('email')
    .eq('email', email.toLowerCase())
    .limit(1);

  if (error) {
    console.warn('Error verificando email:', error);
    return false; // En caso de error, permitir continuar
  }

  return data && data.length > 0;
}

/**
 * Registra un nuevo usuario en Supabase Auth con metadatos
 */
export async function signUpUser(email: string, password: string, userData?: {
  nombre?: string;
  apellido?: string;
  telefono?: string;
}) {
  const metadataToSend = {
    name: userData?.nombre || '',
    last_name: userData?.apellido || '',
    phone: userData?.telefono || ''
  };

  const { data, error } = await supabase.auth.signUp({
    email,
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Traducir el mensaje de error antes de retornarlo
    const translated = mapSupabaseErrorMessage(error.message);
    return { data: null, error: { message: translated } };
  }

  return { data, error: null };
}




/**
 * Obtiene el perfil del ciudadano actual
 */
export async function getCurrentCitizenProfile(userId: string) {
  // Deprecated: delegate to getUserProfile for unified data access
  const result = await getUserProfile(userId);
  return { data: result.profile, error: result.error };
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
  } catch {}
  // 2) Fallback: COUNT sin traer filas
  try {
    const { error, count } = await supabase
      .from('inspectores')
      .select('id', { head: true, count: 'exact' })
      .eq('usuario_id', userId);
    if (error) {
      console.warn('[Auth] isUserInspector fallback error', error);
      return false;
    }
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Obtiene el perfil del usuario (perfiles_ciudadanos) y si es inspector.
 * Devuelve { profile, isInspector, error }.
 */
export async function getUserProfile(userId: string) {
  try {
    // Intentamos traer el perfil y la relación con inspectores en una sola llamada.
    // Supabase permite seleccionar relaciones si existen FK configuradas.
    const { data, error } = await supabase
      .from('perfiles_ciudadanos')
      .select('*, inspectores(id)')
      .eq('usuario_id', userId)
      .limit(1)
      .single();

    if (error) {
      // Si la relación no está configurada o hay error, intentamos fallback

      // Fallback: obtener perfil y comprobar inspectores por separado
      const { data: profileData, error: profErr } = await supabase
        .from('perfiles_ciudadanos')
        .select('*')
        .eq('usuario_id', userId)
        .single();

      const { data: inspData, error: inspErr } = await supabase
        .from('inspectores')
        .select('id')
        .eq('usuario_id', userId)
        .limit(1);

      const isInspector = Array.isArray(inspData) && inspData.length > 0;

      return { profile: profileData ?? null, isInspector, error: profErr ?? inspErr ?? error };
    }

    // data may include inspectores relation
    const profile = data as any;

    // Consulta directa a la tabla inspectores por usuario_id

    let isInspector = false;
    try {
      // Consulta con eq
      const { data: inspDataEq } = await supabase
        .from('inspectores')
        .select('id, usuario_id')
        .eq('usuario_id', userId)
        .limit(1);

      // Consulta con ilike
      const { data: inspDataIlike } = await supabase
        .from('inspectores')
        .select('id, usuario_id')
        .ilike('usuario_id', userId)
        .limit(1);

      isInspector = (Array.isArray(inspDataEq) && inspDataEq.length > 0) || (Array.isArray(inspDataIlike) && inspDataIlike.length > 0);
    } catch (e) {
      isInspector = false;
    }

    // Remove inspectores relation from returned profile to keep shape consistent
    if (profile && profile.inspectores) {
      delete profile.inspectores;
    }

    return { profile: profile ?? null, isInspector, error: null };
  } catch (_e) {
    return { profile: null, isInspector: false, error: _e };
  }
}

/**
 * Cierra la sesión del usuario
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}


export default function AuthApiRoute(): React.ReactElement | null {
  return null;
}

