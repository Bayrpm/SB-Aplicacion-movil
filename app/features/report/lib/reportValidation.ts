/**
 * reportValidation.ts
 * Validaciones específicas para reportes, evidencias y comentarios
 */

import { validateContent, validateCoordinates, validateFileSize, validateMimeType } from '../../auth/lib/inputValidation';

/**
 * Valida todos los datos de un reporte antes de crearlo
 */
export function validateReportData(payload: {
  titulo?: string;
  descripcion?: string;
  ubicacion_texto?: string | null;
  coords_x?: number | null;
  coords_y?: number | null;
  categoria_publica_id?: number | null;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // Validar título
  if (!payload.titulo || payload.titulo.trim().length === 0) {
    errors.titulo = 'El título es requerido';
  } else if (payload.titulo.length < 5) {
    errors.titulo = 'El título debe tener al menos 5 caracteres';
  } else if (payload.titulo.length > 200) {
    errors.titulo = 'El título no puede exceder 200 caracteres';
  }

  // Validar descripción
  const descValidation = validateContent(payload.descripcion);
  if (!descValidation.valid) {
    errors.descripcion = descValidation.error || 'Descripción inválida';
  } else if (payload.descripcion && payload.descripcion.length < 10) {
    errors.descripcion = 'La descripción debe tener al menos 10 caracteres';
  }

  // Validar ubicación
  if (!payload.ubicacion_texto || payload.ubicacion_texto.trim().length === 0) {
    errors.ubicacion_texto = 'La ubicación es requerida';
  } else if (payload.ubicacion_texto.length > 500) {
    errors.ubicacion_texto = 'La ubicación no puede exceder 500 caracteres';
  }

  // Validar coordenadas
  const coordsValidation = validateCoordinates(payload.coords_x ?? null, payload.coords_y ?? null);
  if (!coordsValidation.valid) {
    errors.coordenadas = coordsValidation.error || 'Las coordenadas no son válidas';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida un comentario antes de crearlo
 */
export function validateComment(content: string, maxLength: number = 5000): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'El comentario no puede estar vacío' };
  }

  if (content.length > maxLength) {
    return { valid: false, error: `El comentario no puede exceder ${maxLength} caracteres` };
  }

  return validateContent(content);
}

/**
 * Valida evidencia (foto o video) antes de subirla
 */
export function validateEvidence(
  fileUri: string,
  mimeType: string,
  fileSizeBytes: number
): { valid: boolean; error?: string } {
  if (!fileUri) {
    return { valid: false, error: 'El archivo es requerido' };
  }

  // Validar MIME type
  const mimeValidation = validateMimeType(mimeType, ['image/jpeg', 'image/png', 'image/webp', 'video/mp4']);
  if (!mimeValidation.valid) {
    return mimeValidation;
  }

  // Validar tamaño (50MB máximo)
  const sizeValidation = validateFileSize(fileSizeBytes, 50);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  return { valid: true };
}

/**
 * Sanitiza contenido de comentario/reporte (sin HTML/JS)
 */
export function sanitizeContent(content: string, maxLength: number = 5000): string {
  if (!content) return '';

  return content
    .trim()
    .replace(/[<>\"'`]/g, '') // Elimina caracteres HTML/JS
    .replace(/[\r\n]+/g, '\n') // Normaliza saltos de línea
    .replace(/\s+/g, ' ') // Normaliza espacios
    .substring(0, maxLength);
}
