import { supabase } from '@/app/shared/lib/supabase';
import { toByteArray } from 'base64-js';
import * as FileSystem from 'expo-file-system/legacy';

export type EvidenceKind = 'FOTO' | 'VIDEO';

function guessExtFromUri(uri: string, kind: EvidenceKind): string {
  const m = uri.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  if (m) return m[1].toLowerCase();
  return kind === 'VIDEO' ? 'mp4' : 'jpg';
}

function guessMime(ext: string, kind: EvidenceKind): string {
  const e = ext.toLowerCase();
  if (kind === 'VIDEO') {
    if (e === 'mp4') return 'video/mp4';
    if (e === 'mov') return 'video/quicktime';
    if (e === 'mkv') return 'video/x-matroska';
    if (e === '3gp') return 'video/3gpp';
    return 'video/mp4';
  }
  // image
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  if (e === 'heic' || e === 'heif') return 'image/heif';
  return 'image/jpeg';
}

export async function uploadEvidenceForReport(params: {
  denunciaId: string;
  usuarioId: string;
  fileUri: string;
  kind: EvidenceKind; // 'FOTO' | 'VIDEO'
  orden?: number;
}): Promise<{
  ok: boolean;
  storagePath?: string;
  error?: string;
}> {
  const { denunciaId, usuarioId, fileUri, kind } = params;
  try {
    const now = Date.now();
    const ext = guessExtFromUri(fileUri, kind);
    const contentType = guessMime(ext, kind);
    // Nombre único: timestamp + random base36 (sufijo largo)
    const uniqueSuffix = Math.random().toString(36).slice(2, 12);
    const fileName = `${now}-${uniqueSuffix}.${ext}`;
    const storagePath = `${usuarioId}/${denunciaId}/${fileName}`;

  // Usar la API legacy de expo-file-system para leer como base64
  // (importada desde 'expo-file-system/legacy' para evitar warnings de deprecación)
  const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
  const bytes = toByteArray(base64);

    // Subir al bucket privado 'evidencias' (sin reintentos; nombres siempre únicos)
    const { error: upErr } = await supabase.storage.from('evidencias').upload(storagePath, bytes, {
      contentType,
      upsert: false,
    });
    if (upErr) {
return { ok: false, error: upErr.message || 'Error al subir evidencia' };
    }

    // Insertar fila en denuncia_evidencias
    const { error: dbErr } = await supabase.from('denuncia_evidencias').insert({
      denuncia_id: denunciaId,
      tipo: kind,
      storage_path: storagePath,
      orden: params.orden ?? 1,
    });
    if (dbErr) {
return { ok: false, error: dbErr.message || 'Error al registrar evidencia' };
    }

    return { ok: true, storagePath };
  } catch (e: any) {
return { ok: false, error: e?.message || 'Error al subir evidencia' };
  }
}

export async function listEvidencesSigned(denunciaId: string): Promise<Array<{
  tipo: EvidenceKind;
  url: string;
  storage_path: string;
  thumb_url?: string | null;
}>> {
  try {
    // Debug: comprobar que existe sesión activa (si no hay sesión las policies de storage pueden bloquear access)
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
}
    } catch (e) {
}
    const { data, error } = await supabase
      .from('denuncia_evidencias')
      .select('tipo, storage_path, orden')
      .eq('denuncia_id', denunciaId)
      .order('orden', { ascending: true })
      .order('id', { ascending: true });

    if (error || !data) return [];

  const out: Array<{ tipo: EvidenceKind; url: string; storage_path: string; thumb_url?: string | null; }> = [];
    for (const row of data) {
      const sp = String(row.storage_path);
      // Generar URL firmada con validez más larga (24 horas) para evitar expiraciones
      // durante la reproducción en dispositivos o cuando el usuario abre el video más tarde.
      const { data: signed, error: sErr } = await supabase.storage.from('evidencias').createSignedUrl(sp, 24 * 60 * 60);
      if (sErr || !signed?.signedUrl) {
continue;
      }

      // Intentar también devolver una miniatura si existe. Se asume convención: thumbnail = storage_path + '.jpg'
      let thumbUrl: string | null = null;
      try {
        const thumbPath = `${sp}.jpg`;
        const { data: tdata, error: tErr } = await supabase.storage.from('evidencias').createSignedUrl(thumbPath, 24 * 60 * 60);
        if (!tErr && tdata?.signedUrl) thumbUrl = tdata.signedUrl;
      } catch (thumbErr) {
        // ignorar
      }

      out.push({ tipo: (row.tipo as EvidenceKind) || 'FOTO', url: signed.signedUrl, storage_path: sp, thumb_url: thumbUrl });
    }
    return out;
  } catch {
    return [];
  }
}

// Subida con reintentos y progreso simulado (por limitaciones del SDK, la API de Supabase no expone progreso de bytes)
export async function uploadEvidenceForReportWithProgress(
  params: {
    denunciaId: string;
    usuarioId: string;
    fileUri: string;
    kind: EvidenceKind;
    orden?: number;
    // mantenemos este campo opcional para compatibilidad con callers que lo pasan (p.ej. reportForm)
    maxRetries?: number;
  },
  onProgress?: (progress: number) => void
): Promise<{ ok: boolean; storagePath?: string; error?: string; tries: number }>
{
  const { denunciaId, usuarioId, fileUri, kind } = params;
  let ext = guessExtFromUri(fileUri, kind);
  const now = Date.now();
  let effectiveUri = fileUri;

  // Compresión previa para imágenes (reduce tamaño y usa JPEG)
  if (kind === 'FOTO') {
    try {
      const ImageManipulator = await import('expo-image-manipulator');
      const manipulated = await ImageManipulator.manipulateAsync(fileUri, [], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
      if (manipulated?.uri) {
        effectiveUri = manipulated.uri;
        ext = 'jpg';
      }
    } catch {}
  }

  // Generar nombre único (siempre nuevo, sin reintentos)
  const uniqueSuffix = Math.random().toString(36).slice(2, 12);
  const fileName = `${now}-${uniqueSuffix}.${ext}`;
  const storagePath = `${usuarioId}/${denunciaId}/${fileName}`;

  try {
    onProgress?.(0.1);

    // Compresión previa y resize para imágenes: reducir dimensiones y tamaño para acelerar upload
    if (kind === 'FOTO') {
      try {
        const ImageManipulator = await import('expo-image-manipulator');
        // Redimensionar a ancho máximo 1280px y comprimir a 0.65
        const manipulated = await ImageManipulator.manipulateAsync(
          effectiveUri,
          [{ resize: { width: 1280 } }],
          { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG }
        );
        if (manipulated?.uri) {
          effectiveUri = manipulated.uri;
          ext = 'jpg';
        }
      } catch (e) {
        // Si falla, seguimos con el URI original
      }
    }

    // Leer archivo local como base64 usando la API legacy (estable)
    const base64 = await FileSystem.readAsStringAsync(effectiveUri, { encoding: 'base64' });
    onProgress?.(0.25);

    const bytes = toByteArray(base64);
    onProgress?.(0.5);

    // Intento de upload (sin reintentos: nombres siempre únicos)
    const { error: upErr } = await supabase.storage.from('evidencias').upload(storagePath, bytes, {
      contentType: guessMime(ext, kind),
      upsert: false,
    });

    if (upErr) {
return { ok: false, error: upErr.message || 'Error al subir evidencia', tries: 1 };
    }

    onProgress?.(0.8);

    const { error: dbErr } = await supabase.from('denuncia_evidencias').insert({
      denuncia_id: denunciaId,
      tipo: kind,
      storage_path: storagePath,
      orden: params.orden ?? 1,
    });
    if (dbErr) {
return { ok: false, error: dbErr.message || 'Error al registrar evidencia', tries: 1 };
    }

    onProgress?.(1);
    return { ok: true, storagePath, tries: 1 };
  } catch (e: any) {
return { ok: false, error: e?.message || 'Fallo al subir evidencia', tries: 1 };
  }
}

// Placeholder default export so expo-router doesn't treat this file as a route missing a default export.
// This file is an API module, not a UI route.
export default function __expo_router_placeholder__(): any {
  return null;
}