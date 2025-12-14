/**
 * inputValidation.ts
 * Validación y sanitización de inputs para toda la aplicación
 * - Validadores para email, password, RUT, teléfono, coordenadas
 * - Sanitizadores para prevenir XSS
 * - Validadores de archivos (MIME type, tamaño)
 */

// =============================================================================
// REGEX PATTERNS
// =============================================================================

// Email: RFC 5322 simplificado
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Nombre: Solo letras, espacios, acentos
export const NAME_REGEX = /^[a-záéíóúñA-ZÁÉÍÓÚÑ\s]{2,100}$/;

// RUT chileno: Formato XX.XXX.XXX-X o XXXXXXXX-X
export const RUT_REGEX = /^(\d{1,2}\.?\d{3}\.?\d{3}[-]?[0-9kK]|\d{8}[-]?[0-9kK])$/;

// Teléfono chileno: 9 dígitos comenzando con 9, puede tener + y espacios
export const PHONE_REGEX = /^(\+?56)?[\s]?9[\s]?(\d{4})[\s]?(\d{4})$|^\+?56[\s]?9[\s]?\d{8}$/;

// Coordenadas GPS: Latitud -90 a 90, Longitud -180 a 180
export const LATITUDE_REGEX = /^[-+]?([0-8]?[0-9]|90)(\.[0-9]{1,8})?$/;
export const LONGITUDE_REGEX = /^[-+]?(180|1[0-7][0-9]|[0-9]{1,2})(\.[0-9]{1,8})?$/;

// =============================================================================
// SANITIZACIÓN
// =============================================================================

/**
 * Sanitiza un string para prevenir XSS
 * Escapa caracteres peligrosos HTML
 */
export function sanitizeString(input: string | undefined | null): string {
  if (!input) return '';

  return String(input)
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitiza un email (lowercase, trim)
 */
export function sanitizeEmail(input: string | undefined | null): string {
  if (!input) return '';
  return String(input).toLowerCase().trim();
}

/**
 * Sanitiza un RUT chileno (remueve puntos, normaliza formato)
 */
export function sanitizeRut(input: string | undefined | null): string {
  if (!input) return '';
  return String(input)
    .toUpperCase()
    .replace(/\./g, '')
    .trim();
}

/**
 * Sanitiza un teléfono (remueve espacios, +, normaliza)
 */
export function sanitizePhone(input: string | undefined | null): string {
  if (!input) return '';
  // Remueve todo excepto dígitos
  return String(input).replace(/\D/g, '');
}

// =============================================================================
// VALIDADORES
// =============================================================================

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valida un nombre
 */
export function validateName(name: string | undefined | null): ValidationResult {
  if (!name || String(name).trim().length === 0) {
    return { valid: false, error: 'El nombre es requerido' };
  }

  const sanitized = sanitizeString(name);
  if (!NAME_REGEX.test(sanitized)) {
    return { valid: false, error: 'El nombre debe contener solo letras y espacios (mín 2, máx 100 caracteres)' };
  }

  return { valid: true };
}

/**
 * Valida un email
 */
export function validateEmail(email: string | undefined | null): ValidationResult {
  if (!email || String(email).trim().length === 0) {
    return { valid: false, error: 'El email es requerido' };
  }

  const sanitized = sanitizeEmail(email);
  if (!EMAIL_REGEX.test(sanitized)) {
    return { valid: false, error: 'El formato del email no es válido' };
  }

  if (sanitized.length > 255) {
    return { valid: false, error: 'El email es demasiado largo (máximo 255 caracteres)' };
  }

  return { valid: true };
}

/**
 * Valida una contraseña
 * - Mínimo 8 caracteres
 * - Al menos una mayúscula, una minúscula, un número y un carácter especial
 */
export function validatePassword(password: string | undefined | null): ValidationResult {
  if (!password || String(password).trim().length === 0) {
    return { valid: false, error: 'La contraseña es requerida' };
  }

  const pwd = String(password);

  if (pwd.length < 8) {
    return { valid: false, error: 'La contraseña debe tener mínimo 8 caracteres' };
  }

  if (pwd.length > 128) {
    return { valid: false, error: 'La contraseña es demasiado larga' };
  }

  if (!/[A-Z]/.test(pwd)) {
    return { valid: false, error: 'La contraseña debe contener al menos una mayúscula' };
  }

  if (!/[a-z]/.test(pwd)) {
    return { valid: false, error: 'La contraseña debe contener al menos una minúscula' };
  }

  if (!/[0-9]/.test(pwd)) {
    return { valid: false, error: 'La contraseña debe contener al menos un número' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
    return { valid: false, error: 'La contraseña debe contener al menos un carácter especial (!@#$%^&* etc)' };
  }

  return { valid: true };
}

/**
 * Valida un RUT chileno con verificación de dígito verificador
 */
export function validateRut(rut: string | undefined | null): ValidationResult {
  if (!rut || String(rut).trim().length === 0) {
    return { valid: false, error: 'El RUT es requerido' };
  }

  const sanitized = sanitizeRut(rut);

  if (!RUT_REGEX.test(sanitized)) {
    return { valid: false, error: 'El formato del RUT no es válido (ej: 12345678-9 o 12.345.678-9)' };
  }

  // Verificar dígito verificador
  const parts = sanitized.split('-');
  if (parts.length !== 2) {
    return { valid: false, error: 'El RUT debe contener un guion' };
  }

  const number = parts[0].replace(/\./g, '');
  const verifier = parts[1].toUpperCase();

  if (!/^\d+$/.test(number)) {
    return { valid: false, error: 'El RUT debe contener solo dígitos antes del guion' };
  }

  // Calcular dígito verificador
  const calculatedVerifier = calculateRutVerifier(number);
  if (calculatedVerifier !== verifier) {
    return { valid: false, error: 'El RUT tiene un dígito verificador inválido' };
  }

  return { valid: true };
}

/**
 * Valida un teléfono chileno
 */
export function validatePhone(phone: string | undefined | null): ValidationResult {
  if (!phone || String(phone).trim().length === 0) {
    return { valid: false, error: 'El teléfono es requerido' };
  }

  if (!PHONE_REGEX.test(String(phone))) {
    return { valid: false, error: 'El formato del teléfono no es válido (9 dígitos después del 9)' };
  }

  return { valid: true };
}

/**
 * Valida coordenadas GPS
 */
export function validateCoordinates(
  latitude: string | number | undefined | null,
  longitude: string | number | undefined | null
): ValidationResult {
  if (latitude === undefined || latitude === null) {
    return { valid: false, error: 'La latitud es requerida' };
  }

  if (longitude === undefined || longitude === null) {
    return { valid: false, error: 'La longitud es requerida' };
  }

  const latStr = String(latitude);
  const lonStr = String(longitude);

  if (!LATITUDE_REGEX.test(latStr)) {
    return { valid: false, error: 'Latitud inválida (debe estar entre -90 y 90)' };
  }

  if (!LONGITUDE_REGEX.test(lonStr)) {
    return { valid: false, error: 'Longitud inválida (debe estar entre -180 y 180)' };
  }

  return { valid: true };
}

/**
 * Valida contenido de texto (comentarios, descripciones)
 * - Máximo 5000 caracteres
 * - Sin scripts o HTML peligroso
 */
export function validateContent(content: string | undefined | null): ValidationResult {
  if (!content || String(content).trim().length === 0) {
    return { valid: false, error: 'El contenido no puede estar vacío' };
  }

  const text = String(content);

  if (text.length > 5000) {
    return { valid: false, error: 'El contenido es demasiado largo (máximo 5000 caracteres)' };
  }

  // Detectar scripts potenciales
  if (/<script|<iframe|javascript:|on\w+=/i.test(text)) {
    return { valid: false, error: 'El contenido contiene elementos peligrosos' };
  }

  return { valid: true };
}

/**
 * Valida MIME type de un archivo
 * Whitelist de tipos permitidos
 */
export function validateMimeType(
  mimeType: string | undefined | null,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
): ValidationResult {
  if (!mimeType || String(mimeType).trim().length === 0) {
    return { valid: false, error: 'El tipo de archivo no se pudo determinar' };
  }

  const type = String(mimeType).toLowerCase();

  if (!allowedTypes.includes(type)) {
    return { valid: false, error: `Tipo de archivo no permitido. Permitidos: ${allowedTypes.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Valida tamaño de archivo
 */
export function validateFileSize(
  sizeBytes: number | undefined | null,
  maxSizeMB: number = 10
): ValidationResult {
  if (sizeBytes === undefined || sizeBytes === null) {
    return { valid: false, error: 'No se pudo determinar el tamaño del archivo' };
  }

  const maxBytes = maxSizeMB * 1024 * 1024;

  if (sizeBytes > maxBytes) {
    return { valid: false, error: `El archivo es demasiado grande (máximo ${maxSizeMB}MB)` };
  }

  return { valid: true };
}

/**
 * Valida múltiples campos a la vez
 */
export function validateMultiple(
  validations: ValidationResult[]
): { valid: boolean; errors: string[] } {
  const errors = validations.filter((v) => !v.valid).map((v) => v.error || 'Error desconocido');

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Calcula el dígito verificador de un RUT chileno
 */
function calculateRutVerifier(rutNumber: string): string {
  let sum = 0;
  let multiplier = 2;

  for (let i = rutNumber.length - 1; i >= 0; i--) {
    sum += parseInt(rutNumber[i], 10) * multiplier;
    multiplier++;
    if (multiplier > 7) {
      multiplier = 2;
    }
  }

  const remainder = 11 - (sum % 11);

  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return remainder.toString();
}
