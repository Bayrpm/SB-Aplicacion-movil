/**
 * securityUtils.ts
 * Utilidades de seguridad generales para toda la aplicación
 * - Sanitización de strings
 * - Logging seguro (sin exponer datos sensibles)
 * - Error handling seguro
 * - Validación de permisos
 */

import { supabase } from '@/app/shared/lib/supabase';

// =============================================================================
// LOGGING DE AUDITORÍA
// =============================================================================

enum LogLevel {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

interface AuditLogEntry {
  level: LogLevel;
  timestamp: string;
  action: string;
  userId?: string;
  details?: Record<string, any>;
  errorMessage?: string;
}

/**
 * Registra un evento de auditoría de forma segura
 * NUNCA expone datos sensibles (passwords, tokens, etc)
 */
export async function logAuditEvent(
  action: string,
  level: LogLevel = LogLevel.INFO,
  details?: Record<string, any>,
  errorMessage?: string
): Promise<void> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    const entry: AuditLogEntry = {
      level,
      timestamp: new Date().toISOString(),
      action,
      userId,
      details: sanitizeForLogging(details),
      errorMessage,
    };

    // En desarrollo, log a console
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${entry.level}] ${entry.timestamp} - ${action}`, entry.details);
    }

    // TODO: En producción, enviar a servicio de logging centralizado
    // await sendToLoggingService(entry);
  } catch (err) {
    // No romper el flujo si el logging falla
    console.error('Error al registrar evento de auditoría:', err);
  }
}

/**
 * Registra intentos de autenticación fallidos
 * Importante para detectar ataques de fuerza bruta
 */
export async function logAuthAttempt(
  email: string,
  success: boolean,
  errorReason?: string
): Promise<void> {
  await logAuditEvent(`AUTH_ATTEMPT_${success ? 'SUCCESS' : 'FAILURE'}`, success ? LogLevel.INFO : LogLevel.WARNING, {
    emailHash: hashString(email), // Hash del email, no el email directo
    success,
    reason: errorReason,
  });
}

/**
 * Registra cambios de datos sensibles (perfil, etc)
 */
export async function logDataChange(
  entityType: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  changes?: Record<string, { old: any; new: any }>
): Promise<void> {
  await logAuditEvent(`DATA_${action}_${entityType}`, LogLevel.INFO, {
    changes: sanitizeForLogging(changes),
  });
}

/**
 * Sanitiza datos para que sean seguros de loguear
 * Elimina passwords, tokens, números de tarjeta, etc
 */
function sanitizeForLogging(data: any): any {
  if (!data) return undefined;

  const sensitiveKeys = ['password', 'token', 'jwt', 'secret', 'apiKey', 'creditCard', 'ssn', 'pin'];
  const result = JSON.parse(JSON.stringify(data));

  const sanitizeObject = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    Object.keys(obj).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    });
  };

  sanitizeObject(result);
  return result;
}

// =============================================================================
// MANEJO DE ERRORES SEGURO
// =============================================================================

/**
 * Convierte errores de base de datos / API en mensajes seguros para el usuario
 * Nunca expone detalles técnicos internos
 */
export function getSecureErrorMessage(error: any, defaultMessage: string = 'Ocurrió un error. Intenta de nuevo.'): string {
  if (!error) return defaultMessage;

  const message = (error.message || String(error)).toLowerCase();
  const code = error.code || '';

  // Mapeo seguro de errores
  const errorMap: Record<string, string> = {
    // Auth
    'user_already_exists': 'Este usuario ya existe. Intenta con otro email.',
    'invalid_credentials': 'Credenciales inválidas. Verifica tu email y contraseña.',
    'weak_password': 'La contraseña es muy débil. Usa mayúsculas, minúsculas y números.',
    'email_not_confirmed': 'Por favor confirma tu email antes de continuar.',
    'rate_limit': 'Demasiados intentos. Intenta más tarde.',
    'network': 'Error de red. Verifica tu conexión.',
    'timeout': 'La solicitud tardó demasiado. Intenta de nuevo.',

    // Database
    'foreign_key_violation': 'Referencia inválida. Algunos datos no existen.',
    'unique_violation': 'Este registro ya existe.',
    'permission_denied': 'No tienes permiso para esta acción.',
    'row_level_security': 'No tienes permiso para acceder a estos datos.',
  };

  for (const [key, msg] of Object.entries(errorMap)) {
    if (message.includes(key) || code.includes(key)) {
      return msg;
    }
  }

  // Fallback genérico
  return defaultMessage;
}

/**
 * Valida que el usuario tenga permisos para acceder a un recurso
 * Previene IDOR (Insecure Direct Object References)
 */
export async function checkOwnership(userId: string, resourceUserId: string): Promise<boolean> {
  if (userId !== resourceUserId) {
    await logAuditEvent('UNAUTHORIZED_ACCESS_ATTEMPT', LogLevel.WARNING, {
      userId,
      resourceOwner: hashString(resourceUserId),
    });
    return false;
  }
  return true;
}

/**
 * Valida que el usuario esté autenticado
 */
export async function ensureAuthenticated(): Promise<string> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user?.id) {
    throw new Error('Usuario no autenticado');
  }
  return authData.user.id;
}

// =============================================================================
// UTILIDADES DE HASHING
// =============================================================================

/**
 * Crea un hash simple de string para logging
 * NO para contraseñas - solo para anonimizar datos en logs
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 12);
}

// =============================================================================
// VALIDACIÓN DE TIPOS
// =============================================================================

/**
 * Valida que un valor sea un UUID válido
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Valida que un número sea un entero positivo
 */
export function isValidPositiveInt(value: any): boolean {
  const num = parseInt(String(value), 10);
  return Number.isFinite(num) && num > 0;
}

/**
 * Valida que una variable sea un objeto válido (no null, no array)
 */
export function isValidObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// =============================================================================
// LIMPIEZA DE DATOS
// =============================================================================

/**
 * Limpia datos sensibles del estado/memoria después de uso
 * Útil para datos como contraseñas, tokens temporales, etc
 */
export function clearSensitiveData(data: any): void {
  if (typeof data === 'object' && data !== null) {
    Object.keys(data).forEach((key) => {
      if (typeof data[key] === 'string') {
        // Sobrescribe con ceros (garbage collection)
        data[key] = new Array(data[key].length).fill('0').join('');
        delete data[key];
      } else if (typeof data[key] === 'object') {
        clearSensitiveData(data[key]);
      }
    });
  }
}

// =============================================================================
// EXPORTAR LOGGING HELPERS
// =============================================================================

export const AuditLog = {
  error: (action: string, details?: Record<string, any>, errorMessage?: string) =>
    logAuditEvent(action, LogLevel.ERROR, details, errorMessage),
  warning: (action: string, details?: Record<string, any>) => logAuditEvent(action, LogLevel.WARNING, details),
  info: (action: string, details?: Record<string, any>) => logAuditEvent(action, LogLevel.INFO, details),
  debug: (action: string, details?: Record<string, any>) => logAuditEvent(action, LogLevel.DEBUG, details),
};
