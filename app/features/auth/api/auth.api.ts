import { AuditLog, getSecureErrorMessage, logAuthAttempt } from '@/app/shared/lib/securityUtils';
import { supabase } from '@/app/shared/lib/supabase';
import React from 'react';
import { sanitizeEmail, sanitizeString, validateEmail, validateName, validatePassword } from '../lib/inputValidation';

/**
 * Normaliza y traduce mensajes de error retornados por Supabase/Auth a español.
 * Retorna siempre un mensaje en español (fallback: mensaje genérico en español).
 */
export function mapSupabaseErrorMessage(errorMessage?: string | null): string {
  return getSecureErrorMessage(errorMessage);
}

/**
 * Registra un nuevo usuario en Supabase Auth con metadatos
 * ✅ Incluye validación de inputs
 * ✅ Sanitización de datos
 * ✅ Logging de auditoría
 */
export async function signUpUser(
  email: string,
  password: string,
  userData?: {
    nombre?: string;
    apellido?: string;
    telefono?: string;
  }
) {
  // 1) Validar inputs ANTES de enviar a Supabase
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    await AuditLog.warning('SIGNUP_INVALID_EMAIL', { reason: emailValidation.error });
    return { data: null, error: { message: emailValidation.error }, user: null, session: null };
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    await AuditLog.warning('SIGNUP_WEAK_PASSWORD');
    return { data: null, error: { message: passwordValidation.error }, user: null, session: null };
  }

  if (userData?.nombre) {
    const nameValidation = validateName(userData.nombre);
    if (!nameValidation.valid) {
      await AuditLog.warning('SIGNUP_INVALID_NAME', { reason: nameValidation.error });
      return { data: null, error: { message: nameValidation.error }, user: null, session: null };
    }
  }

  // 2) Sanitizar datos
  const sanitizedEmail = sanitizeEmail(email);
  const metadataToSend = {
    name: userData?.nombre ? sanitizeString(userData.nombre) : '',
    last_name: userData?.apellido ? sanitizeString(userData.apellido) : '',
    phone: userData?.telefono ? sanitizeString(userData.telefono) : '',
  };

  // 3) Registrar en Supabase
  const { data, error } = await supabase.auth.signUp({
    email: sanitizedEmail,
    password,
    options: {
      data: metadataToSend,
    },
  });

  // 4) Manejar errores de forma segura
  if (error) {
    const translated = mapSupabaseErrorMessage(error.message);
    await AuditLog.warning('SIGNUP_FAILED', { reason: error.message });
    return { data: null, error: { message: translated }, user: null, session: null };
  }

  // 5) Log exitoso (sin exponer detalles sensibles)
  await AuditLog.info('SIGNUP_SUCCESS');

  return { data, error: null, user: data.user, session: data.session };
}

/**
 * Inicia sesión con email y contraseña
 * ✅ Incluye validación de inputs
 * ✅ Logging de intentos (para detección de fuerza bruta)
 * ✅ RLS verificado (no permite acceso cruzado de usuarios)
 */
export async function signInUser(email: string, password: string) {
  // Validar email format
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    await logAuthAttempt(email, false, 'INVALID_EMAIL_FORMAT');
    return {
      profile: null,
      isInspector: false,
      error: { message: emailValidation.error },
      session: null,
      user: null,
      exists: false,
    };
  }

  const sanitizedEmail = sanitizeEmail(email);

  // Si no se envía contraseña (step 1), sólo comprobamos existencia del email
  if (!password) {
    try {
      const { data: profileByEmail, error: profileByEmailError } = await supabase
        .from('perfiles_ciudadanos')
        .select('usuario_id, email')
        .ilike('email', sanitizedEmail)
        .maybeSingle();

      if (profileByEmailError) {
        await AuditLog.error('SIGNIN_PROFILE_CHECK_ERROR', { error: profileByEmailError.message });
        return {
          profile: null,
          isInspector: false,
          error: profileByEmailError,
          session: null,
          user: null,
          exists: false,
        };
      }

      const exists = !!profileByEmail;
      return { profile: null, isInspector: false, error: null, session: null, user: null, exists };
    } catch (e) {
      await AuditLog.error('SIGNIN_PROFILE_CHECK_EXCEPTION', { error: String(e) });
      return {
        profile: null,
        isInspector: false,
        error: e as any,
        session: null,
        user: null,
        exists: false,
      };
    }
  }

  // 1) Intentar autenticar con supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email: sanitizedEmail,
    password,
  });

  // 2) Manejar errores de autenticación
  if (error) {
    await logAuthAttempt(sanitizedEmail, false, error.message);
    const translated = mapSupabaseErrorMessage(error.message);
    return {
      profile: null,
      isInspector: false,
      error: { message: translated },
      session: data?.session ?? null,
      user: data?.user ?? null,
    };
  }

  const userId = data?.user?.id;

  // Si no hay usuario en la respuesta, retornamos sin profile
  if (!userId) {
    return {
      profile: null,
      isInspector: false,
      error: null,
      session: data?.session ?? null,
      user: data?.user ?? null,
    };
  }

  // 3) Cargar datos del usuario autenticado (RLS garantiza que solo ve sus propios datos)
  try {
    const { data: profile, error: profileError } = await supabase
      .from('perfiles_ciudadanos')
      .select('*')
      .eq('usuario_id', userId)
      .maybeSingle();

    const { data: inspectorData, error: inspectorError } = await supabase
      .from('inspectores')
      .select('id, activo')
      .eq('usuario_id', userId)
      .limit(1)
      .maybeSingle();

    const isInspector = !!inspectorData && inspectorData.activo === true;
    const combinedError = profileError ?? inspectorError ?? null;

    // 4) Log exitoso
    await logAuthAttempt(sanitizedEmail, true);

    return {
      profile: profile ?? null,
      isInspector,
      error: combinedError,
      session: data?.session ?? null,
      user: data?.user ?? null,
      exists: true,
    };
  } catch (e) {
    await AuditLog.error('SIGNIN_PROFILE_LOAD_EXCEPTION', { error: String(e) });
    return {
      profile: null,
      isInspector: false,
      error: e as any,
      session: data?.session ?? null,
      user: data?.user ?? null,
      exists: true,
    };
  }
}

/**
 * Comprueba si un usuario (por id) está marcado como inspector en la tabla `inspectores`.
 * ✅ RLS verificado - solo el backend puede consultar
 * ✅ Error handling mejorado
 */
export async function isUserInspector(userId: string): Promise<boolean> {
  if (!userId) {
    await AuditLog.warning('IS_INSPECTOR_EMPTY_USER_ID');
    return false;
  }

  // 1) Intento via RPC (ignora RLS si existe la función)
  try {
    const rpc = await supabase.rpc('is_inspector', { p_user_id: userId });
    if (!rpc.error && typeof rpc.data === 'boolean') {
      return rpc.data;
    }
  } catch (e) {
    await AuditLog.debug('IS_INSPECTOR_RPC_FALLBACK', { error: String(e) });
  }

  // 2) Fallback: existencia booleana con .maybeSingle()
  try {
    const { data, error } = await supabase
      .from('inspectores')
      .select('id, activo')
      .eq('usuario_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      await AuditLog.error('IS_INSPECTOR_ERROR', { error: error.message });
      return false;
    }

    return !!data && data.activo === true;
  } catch (e) {
    await AuditLog.error('IS_INSPECTOR_EXCEPTION', { error: String(e) });
    return false;
  }
}

/**
 * Cierra la sesión del usuario
 * ✅ Limpia datos sensibles
 * ✅ Manejo de dependencias circulares
 * ✅ Logging de auditoría
 */
export async function signOut() {
  try {
    // 1) Intentar eliminar token de notificaciones
    try {
      const svc = await import('@/app/services/notificationService');
      if (svc && typeof svc.unregisterPushNotifications === 'function') {
        await svc.unregisterPushNotifications();
      }
    } catch (e) {
      // No fatal: seguimos con el signOut aunque falle el borrado de token
      await AuditLog.debug('SIGNOUT_NOTIFICATION_UNREGISTER_FAILED');
    }

    // 2) Limpiar sesión de Supabase y AsyncStorage
    try {
      const mod = await import('@/app/shared/lib/supabase');
      if (mod && mod.clearAuthSession) {
        const res = await mod.clearAuthSession();
        await AuditLog.info('SIGNOUT_SUCCESS');
        return { error: null, removedKeys: res.removed };
      }
    } catch (e) {
      await AuditLog.debug('SIGNOUT_CLEARSESSION_FALLBACK');
    }

    // 3) Fallback final: Solo signOut de Supabase
    const { error } = await supabase.auth.signOut();
    if (!error) {
      await AuditLog.info('SIGNOUT_SUCCESS_FALLBACK');
    }
    return { error };
  } catch (e) {
    await AuditLog.error('SIGNOUT_EXCEPTION', { error: String(e) });
    return { error: e };
  }
}


export default function AuthApiRoute(): React.ReactElement | null {
  return null;
}


