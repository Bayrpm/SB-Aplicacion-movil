import { supabase } from '@/app/shared/lib/supabase';
import { toByteArray } from 'base64-js';
import * as FileSystem from 'expo-file-system/legacy';
import { validateAndNormalizeCoordinates } from '../lib/coordinatesUtils';
import type { ReportCategory } from '../types';

/**
 * ============================================================================
 * REPORT API - Consolidado
 * 
 * Este archivo centraliza TODAS las operaciones relacionadas con reportes:
 * - Categorías y datos públicos
 * - Creación y lectura de denuncias
 * - Reacciones a reportes
 * - Comentarios en reportes
 * - Evidencias (fotos y videos)
 * ============================================================================
 */

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

export type EvidenceKind = 'FOTO' | 'VIDEO';

const DEFAULT_ICON_MAP: Record<number, string> = {
  1: 'ambulance',
  2: 'alert-circle-outline',
  3: 'shield-alert',
  4: 'pill',
  5: 'pistol',
  6: 'bell-ring-outline',
  7: 'police-badge',
  8: 'dots-horizontal',
};

// ============================================================================
// FUNCIONES AUXILIARES PRIVADAS
// ============================================================================

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
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  if (e === 'heic' || e === 'heif') return 'image/heif';
  return 'image/jpeg';
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// CATEGORÍAS PÚBLICAS
// ============================================================================

/**
 * Obtiene las categorías públicas de reportes.
 */
export async function fetchReportCategories(): Promise<ReportCategory[]> {
  try {
    const { data, error } = await supabase
      .from('categorias_publicas')
      .select('id, nombre, descripcion, orden, activo, created_at')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) return [];
    if (!Array.isArray(data)) return [];

    return data.map((row: any, idx: number) => {
      const iconFromRow = typeof row.icon === 'string' && row.icon.trim() ? row.icon.trim() : undefined;
      const icon = iconFromRow ?? DEFAULT_ICON_MAP[row.id as number];

      return {
        idx,
        id: Number(row.id),
        nombre: String(row.nombre ?? ''),
        descripcion: String(row.descripcion ?? ''),
        orden: Number(row.orden ?? idx),
        activo: Boolean(row.activo),
        icon,
      };
    });
  } catch {
    return [];
  }
}

// ============================================================================
// REPORTES PÚBLICOS
// ============================================================================

/**
 * Obtiene denuncias públicas recientes (últimas 24h).
 */
export async function fetchPublicReports(): Promise<{
  id: string;
  titulo: string;
  descripcion: string;
  coords_x: number;
  coords_y: number;
  categoria_publica_id: number | null;
  fecha_creacion: string;
  ubicacion_texto: string | null;
  anonimo: boolean;
  ciudadano?: { nombre?: string; apellido?: string } | null;
}[]> {
  try {
    const { data, error } = await supabase.rpc('get_denuncias_publicas_recientes');
    if (error) return [];
    if (!Array.isArray(data)) return [];

    return data.map((row: any) => {
      const validation = validateAndNormalizeCoordinates(Number(row.coords_x), Number(row.coords_y));
      return {
        id: String(row.id),
        titulo: String(row.titulo ?? ''),
        descripcion: String(row.descripcion ?? ''),
        coords_x: validation.coordinates.latitude,
        coords_y: validation.coordinates.longitude,
        categoria_publica_id: row.categoria_publica_id != null ? Number(row.categoria_publica_id) : null,
        fecha_creacion: String(row.fecha_creacion ?? ''),
        ubicacion_texto: row.ubicacion_texto ? String(row.ubicacion_texto) : null,
        anonimo: Boolean(row.anonimo),
        ciudadano: row.ciudadano ?? null,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Verifica si ya existe una denuncia reciente (24h) del mismo ciudadano y categoría
 * dentro de un radio especificado.
 */
export async function checkRecentReportByCategory(
  ciudadano_id: string,
  categoria_publica_id: number,
  coords_x: number,
  coords_y: number,
  radio_metros: number = 30
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('get_recent_reports_by_category', {
      p_ciudadano_id: ciudadano_id,
      p_categoria_publica_id: categoria_publica_id,
    });
    if (error) return false;
    if (!Array.isArray(data) || data.length === 0) return false;

    for (const d of data) {
      if (d.coords_x && d.coords_y) {
        const dist = calculateDistance(coords_x, coords_y, d.coords_x, d.coords_y);
        if (dist <= radio_metros) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Detalle completo de una denuncia pública por ID.
 */
export async function fetchPublicReportDetail(id: string): Promise<{
  id: string;
  folio: string | null;
  titulo: string;
  descripcion: string;
  coords_x: number;
  coords_y: number;
  categoria_publica_id: number | null;
  fecha_creacion: string;
  ubicacion_texto: string | null;
  anonimo: boolean;
  ciudadano?: { nombre?: string; apellido?: string };
}> {
  const { data, error } = await supabase
    .rpc('get_denuncia_publica_detalle', { p_id: id })
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No se encontró la denuncia o no es pública');

  const row = data as any;
  const ciudadano = row.ciudadano ?? undefined;
  const validation = validateAndNormalizeCoordinates(Number(row.coords_x), Number(row.coords_y));

  return {
    id: String(row.id),
    folio: row.folio ? String(row.folio) : null,
    titulo: String(row.titulo ?? ''),
    descripcion: String(row.descripcion ?? ''),
    coords_x: validation.coordinates.latitude,
    coords_y: validation.coordinates.longitude,
    categoria_publica_id: row.categoria_publica_id != null ? Number(row.categoria_publica_id) : null,
    fecha_creacion: String(row.fecha_creacion ?? ''),
    ubicacion_texto: row.ubicacion_texto ? String(row.ubicacion_texto) : null,
    anonimo: Boolean(row.anonimo),
    ciudadano,
  };
}

/**
 * Crea una nueva denuncia.
 */
export async function createReport(payload: {
  ciudadano_id: string;
  titulo: string;
  descripcion: string;
  anonimo: boolean;
  ubicacion_texto?: string | null;
  coords_x?: number | null;
  coords_y?: number | null;
  categoria_publica_id?: number | null;
  estado_id?: number | null;
  inspector_id?: number | null;
  consentir_publicacion?: boolean | null;
  prioridad?: string | null;
  cuadrante_id?: number | null;
}) {
  try {
    const ubicacion_texto = payload.ubicacion_texto ?? null;
    let coords_x: number | null = null;
    let coords_y: number | null = null;
    
    if (typeof payload.coords_x === 'number' && Number.isFinite(payload.coords_x)) {
      coords_x = Number(payload.coords_x.toFixed(6));
    }
    if (typeof payload.coords_y === 'number' && Number.isFinite(payload.coords_y)) {
      coords_y = Number(payload.coords_y.toFixed(6));
    }

    if (!ubicacion_texto || coords_x == null || coords_y == null) {
      return { data: null, error: new Error('Ubicación incompleta: se requiere `ubicacion_texto` y coordenadas') };
    }

    const insertObj: any = {
      ciudadano_id: payload.ciudadano_id,
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      anonimo: Boolean(payload.anonimo),
      ubicacion_texto,
      coords_x,
      coords_y,
      categoria_publica_id: payload.categoria_publica_id ?? null,
    };

    if (Object.prototype.hasOwnProperty.call(payload, 'estado_id')) insertObj.estado_id = payload.estado_id;
    if (Object.prototype.hasOwnProperty.call(payload, 'inspector_id')) insertObj.inspector_id = payload.inspector_id;
    if (Object.prototype.hasOwnProperty.call(payload, 'consentir_publicacion')) insertObj.consentir_publicacion = payload.consentir_publicacion;
    if (Object.prototype.hasOwnProperty.call(payload, 'prioridad')) insertObj.prioridad = payload.prioridad;
    if (Object.prototype.hasOwnProperty.call(payload, 'cuadrante_id')) insertObj.cuadrante_id = payload.cuadrante_id;

    const { data, error } = await supabase.from('denuncias').insert(insertObj).select('*');
    if (error) return { data: null, error };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

// ============================================================================
// REACCIONES A REPORTES
// ============================================================================

/**
 * Obtiene estadísticas de un reporte (likes, dislikes, comentarios).
 */
export async function fetchReportStats(reportId: string): Promise<{
  likes: number;
  dislikes: number;
  userReaction: 'LIKE' | 'DISLIKE' | null;
  commentsCount: number;
}> {
  try {
    const { data: statsData } = await supabase
      .from('v_denuncia_reacciones_stats')
      .select('*')
      .eq('denuncia_id', reportId)
      .maybeSingle();

    const { data: comments } = await supabase
      .from('v_denuncia_comentarios_publicos')
      .select('id', { count: 'estimated' })
      .eq('denuncia_id', reportId);

    const { data: userData } = await supabase.auth.getUser();
    let userReaction: 'LIKE' | 'DISLIKE' | null = null;
    if (userData?.user) {
      const { data: r } = await supabase
        .from('denuncia_reacciones')
        .select('tipo')
        .eq('denuncia_id', reportId)
        .eq('usuario_id', userData.user.id)
        .maybeSingle();
      if (r && r.tipo) userReaction = String(r.tipo).toUpperCase() === 'LIKE' ? 'LIKE' : 'DISLIKE';
    }

    const likes = statsData?.likes ?? 0;
    const dislikes = statsData?.dislikes ?? 0;
    const commentsCount = Array.isArray(comments) ? comments.length : 0;

    return { likes, dislikes, userReaction, commentsCount };
  } catch {
    return { likes: 0, dislikes: 0, userReaction: null, commentsCount: 0 };
  }
}

/**
 * Crea o actualiza una reacción (like/dislike) a un reporte.
 */
export async function reactToReport(reportId: string, tipo: 'LIKE' | 'DISLIKE') {
  try {
    const { data, error } = await supabase.rpc('fn_denuncia_reaccionar', {
      p_denuncia_id: reportId,
      p_tipo: tipo,
    });
    if (error) return { data: null, error };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ============================================================================
// COMENTARIOS EN REPORTES
// ============================================================================

/**
 * Obtiene la lista de comentarios públicos para un reporte.
 */
export async function fetchReportComments(reportId: string) {
  try {
    const { data, error } = await supabase
      .from('v_denuncia_comentarios_publicos')
      .select('id, denuncia_id, usuario_id, autor, anonimo, autor_visible, contenido, created_at, parent_id')
      .eq('denuncia_id', reportId)
      .order('created_at', { ascending: false });

    if (error) {
      if ((error as any)?.code === '42703') {
        const { data: data2, error: error2 } = await supabase
          .from('v_denuncia_comentarios_publicos')
          .select('id, denuncia_id, usuario_id, autor, anonimo, autor_visible, contenido, created_at')
          .eq('denuncia_id', reportId)
          .order('created_at', { ascending: false });
        if (error2) return [];
        return (data2 ?? []) as any[];
      }
      return [];
    }

    const rows = (data ?? []) as any[];

    // Enriquecer con avatares
    try {
      const userIds = Array.from(new Set(rows.map((r: any) => r.usuario_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('perfiles_ciudadanos')
          .select('usuario_id, avatar_url')
          .in('usuario_id', userIds as any[]);
        const avatarMap: Record<string, string> = {};
        (profiles || []).forEach((p: any) => {
          if (p?.usuario_id) avatarMap[String(p.usuario_id)] = p.avatar_url ?? null;
        });
        rows.forEach((r: any) => {
          if (!r.avatar_url && r.usuario_id && avatarMap[String(r.usuario_id)]) {
            r.avatar_url = avatarMap[String(r.usuario_id)];
          }
        });
      }
    } catch {
      // ignorar errores de enriquecimiento
    }

    // Enriquecer con reacciones
    try {
      const commentIds = rows.map((r: any) => Number(r.id)).filter((v) => Number.isFinite(v));
      if (commentIds.length > 0) {
        const { data: reactions } = await supabase
          .from('comentario_reacciones')
          .select('comentario_id, tipo, usuario_id')
          .in('comentario_id', commentIds as any[]);

        const likesMap: Record<string, number> = {};
        (reactions || []).forEach((r: any) => {
          if ((r.tipo ?? '').toUpperCase() === 'LIKE') {
            likesMap[String(r.comentario_id)] = (likesMap[String(r.comentario_id)] || 0) + 1;
          }
        });

        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id ?? null;
        const userReactionMap: Record<string, string | null> = {};
        if (userId) {
          const { data: userReacts } = await supabase
            .from('comentario_reacciones')
            .select('comentario_id, tipo')
            .eq('usuario_id', userId)
            .in('comentario_id', commentIds as any[]);
          (userReacts || []).forEach((ur: any) => {
            userReactionMap[String(ur.comentario_id)] = (ur.tipo ?? '').toUpperCase();
          });
        }

        return rows.map((r: any) => ({
          ...r,
          likes: likesMap[String(r.id)] ?? r.likes ?? 0,
          liked: (userReactionMap[String(r.id)] ?? '').toUpperCase() === 'LIKE' || !!r.liked,
        }));
      }
    } catch {
      // ignorar
    }

    return rows;
  } catch {
    return [];
  }
}

/**
 * Crea un comentario en un reporte.
 */
export async function createReportComment(
  reportId: string,
  contenido: string,
  anonimo: boolean = true,
  parentId?: number | null
) {
  try {
    const insertObj: any = { denuncia_id: reportId, contenido, anonimo };
    if (parentId != null) insertObj.parent_id = parentId;

    let res: any;
    try {
      res = await supabase.from('comentarios_denuncias').insert(insertObj).select().maybeSingle();
    } catch (e: any) {
      res = e;
    }

    const data = res?.data ?? null;
    const error = res?.error ?? (res?.message ? res : null);
    if (error) {
      const code = (error as any)?.code ?? (error as any)?.status ?? null;
      const msg = String((error as any)?.message ?? '').toLowerCase();
      if (parentId != null && (String(code) === 'PGRST204' || msg.includes('parent_id'))) {
        const insertFallback: any = { denuncia_id: reportId, contenido, anonimo };
        const { data: data2, error: error2 } = await supabase
          .from('comentarios_denuncias')
          .insert(insertFallback)
          .select()
          .maybeSingle();
        if (error2) return { data: null, error: error2 };
        return { data: data2, error: null };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

/**
 * Crea o actualiza una reacción (like/dislike) a un comentario.
 */
export async function reactToComment(commentId: number, tipo: 'LIKE' | 'DISLIKE') {
  try {
    const { data, error } = await supabase.rpc('fn_comentario_reaccionar', {
      p_comentario_id: commentId,
      p_tipo: tipo,
    });
    if (error) return { data: null, error };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Actualiza el contenido de un comentario (solo autor, máximo 1 hora después de creación).
 */
export async function updateReportComment(commentId: number | string, newContenido: string) {
  try {
    const idNum = Number(commentId);
    if (!Number.isFinite(idNum)) return { data: null, error: new Error('commentId inválido') };

    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('fn_update_comentario_denuncia', {
        p_comentario_id: idNum,
        p_contenido: newContenido,
      });
      if (!rpcErr) return { data: rpcData, error: null };
      const code = (rpcErr as any)?.code ?? '';
      const fallbackable = code === '42883' || code === '42702';
      if (!fallbackable) return { data: null, error: rpcErr };
    } catch {
      // fallback
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('comentarios_denuncias')
      .select('id, usuario_id, created_at, contenido')
      .eq('id', idNum)
      .maybeSingle();

    if (fetchErr) return { data: null, error: fetchErr };
    if (!existing) return { data: null, error: new Error('Comentario no encontrado') };

    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData?.user?.id ?? null;
    if (!currentUserId) return { data: null, error: new Error('No autenticado') };

    if (String(existing.usuario_id) !== String(currentUserId)) {
      return { data: null, error: new Error('No autorizado: no eres el autor del comentario') };
    }

    try {
      const created = new Date(String(existing.created_at));
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const ONE_HOUR_MS = 60 * 60 * 1000;
      if (diffMs > ONE_HOUR_MS) {
        return { data: null, error: new Error('La ventana de edición de 1 hora expiró') };
      }
    } catch {
      return { data: null, error: new Error('No se pudo verificar la fecha de creación del comentario') };
    }

    const { data: updated, error: updateErr } = await supabase
      .from('comentarios_denuncias')
      .update({ contenido: newContenido })
      .eq('id', idNum)
      .select()
      .maybeSingle();

    if (updateErr) {
      if ((updateErr as any)?.code === '42P17' || String(updateErr?.message ?? '').toLowerCase().includes('infinite recursion')) {
        return { data: null, error: new Error('Error de políticas en el servidor: crear una RPC segura (SECURITY DEFINER)') };
      }
      return { data: null, error: updateErr };
    }
    return { data: updated, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Elimina un comentario (solo autor, sin límite de tiempo).
 */
export async function deleteReportComment(commentId: number | string) {
  try {
    const idNum = Number(commentId);
    if (!Number.isFinite(idNum)) return { data: null, error: new Error('commentId inválido') };

    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('fn_delete_comentario_denuncia', {
        p_comentario_id: idNum,
      });
      if (!rpcErr) return { data: rpcData, error: null };
      const msg = String(rpcErr?.message ?? '').toLowerCase();
      if (!(msg.includes('does not exist') || msg.includes('undefined function') || (rpcErr as any)?.code === '42883')) {
        return { data: null, error: rpcErr };
      }
    } catch {
      // fallback
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('comentarios_denuncias')
      .select('id, usuario_id')
      .eq('id', idNum)
      .maybeSingle();

    if (fetchErr) return { data: null, error: fetchErr };
    if (!existing) return { data: null, error: new Error('Comentario no encontrado') };

    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData?.user?.id ?? null;
    if (!currentUserId) return { data: null, error: new Error('No autenticado') };

    if (String(existing.usuario_id) !== String(currentUserId)) {
      return { data: null, error: new Error('No autorizado: no eres el autor del comentario') };
    }

    const { data: deleted, error: delErr } = await supabase
      .from('comentarios_denuncias')
      .delete()
      .eq('id', idNum)
      .select()
      .maybeSingle();

    if (delErr) {
      if ((delErr as any)?.code === '42P17' || String(delErr?.message ?? '').toLowerCase().includes('infinite recursion')) {
        return { data: null, error: new Error('Error de políticas en el servidor: crear una RPC segura (SECURITY DEFINER)') };
      }
      return { data: null, error: delErr };
    }
    return { data: deleted, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ============================================================================
// EVIDENCIAS (FOTOS Y VIDEOS)
// ============================================================================

/**
 * Sube una evidencia (foto o video) para un reporte.
 */
export async function uploadEvidenceForReport(params: {
  denunciaId: string;
  usuarioId: string;
  fileUri: string;
  kind: EvidenceKind;
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
    const uniqueSuffix = Math.random().toString(36).slice(2, 12);
    const fileName = `${now}-${uniqueSuffix}.${ext}`;
    const storagePath = `${usuarioId}/${denunciaId}/${fileName}`;

    const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
    const bytes = toByteArray(base64);

    const { error: upErr } = await supabase.storage.from('evidencias').upload(storagePath, bytes, {
      contentType,
      upsert: false,
    });
    if (upErr) {
      return { ok: false, error: upErr.message || 'Error al subir evidencia' };
    }

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

/**
 * Lista las evidencias de un reporte con URLs firmadas.
 */
export async function listEvidencesSigned(denunciaId: string): Promise<Array<{
  tipo: EvidenceKind;
  url: string;
  storage_path: string;
  thumb_url?: string | null;
}>> {
  try {
    const { data, error } = await supabase
      .from('denuncia_evidencias')
      .select('tipo, storage_path, orden')
      .eq('denuncia_id', denunciaId)
      .order('orden', { ascending: true })
      .order('id', { ascending: true });

    if (error || !data) return [];

    const out: Array<{ tipo: EvidenceKind; url: string; storage_path: string; thumb_url?: string | null }> = [];
    for (const row of data) {
      const sp = String(row.storage_path);
      const { data: signed, error: sErr } = await supabase.storage
        .from('evidencias')
        .createSignedUrl(sp, 24 * 60 * 60);
      if (sErr || !signed?.signedUrl) continue;

      let thumbUrl: string | null = null;
      try {
        const thumbPath = `${sp}.jpg`;
        const { data: tdata } = await supabase.storage.from('evidencias').createSignedUrl(thumbPath, 24 * 60 * 60);
        if (tdata?.signedUrl) thumbUrl = tdata.signedUrl;
      } catch {
        // ignorar
      }

      out.push({
        tipo: (row.tipo as EvidenceKind) || 'FOTO',
        url: signed.signedUrl,
        storage_path: sp,
        thumb_url: thumbUrl,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Sube una evidencia con soporte de progreso y reintentos automáticos.
 */
export async function uploadEvidenceForReportWithProgress(
  params: {
    denunciaId: string;
    usuarioId: string;
    fileUri: string;
    kind: EvidenceKind;
    orden?: number;
    maxRetries?: number;
  },
  onProgress?: (progress: number) => void
): Promise<{ ok: boolean; storagePath?: string; error?: string; tries: number }> {
  const { denunciaId, usuarioId, fileUri, kind } = params;
  let ext = guessExtFromUri(fileUri, kind);
  const now = Date.now();
  let effectiveUri = fileUri;

  // Compresión previa para imágenes (si expo-image-manipulator está disponible)
  if (kind === 'FOTO') {
    try {
      // Intentar importar dinámicamente expo-image-manipulator
      const ImageManipulator = require('expo-image-manipulator');
      if (ImageManipulator?.manipulateAsync) {
        const manipulated = await ImageManipulator.manipulateAsync(fileUri, [], {
          compress: 0.7,
          format: ImageManipulator.SaveFormat?.JPEG || 'jpeg',
        });
        if (manipulated?.uri) {
          effectiveUri = manipulated.uri;
          ext = 'jpg';
        }
      }
    } catch (compressError) {
      // Si no está disponible, continuar sin compresión
      console.warn('expo-image-manipulator no disponible, usando imagen original');
    }
  }

  const uniqueSuffix = Math.random().toString(36).slice(2, 12);
  const fileName = `${now}-${uniqueSuffix}.${ext}`;
  const storagePath = `${usuarioId}/${denunciaId}/${fileName}`;

  try {
    onProgress?.(0.1);

    if (kind === 'FOTO') {
      try {
        // Intentar comprimir imagen antes de subir
        const ImageManipulator = require('expo-image-manipulator');
        if (ImageManipulator?.manipulateAsync) {
          const manipulated = await ImageManipulator.manipulateAsync(
            effectiveUri,
            [{ resize: { width: 1280 } }],
            { compress: 0.65, format: ImageManipulator.SaveFormat?.JPEG || 'jpeg' }
          );
          if (manipulated?.uri) {
            effectiveUri = manipulated.uri;
            ext = 'jpg';
          }
        }
      } catch (compressError) {
        // Si falla la compresión, usar imagen sin comprimir
        console.warn('No se pudo comprimir imagen, usando original');
      }
    }

    const base64 = await FileSystem.readAsStringAsync(effectiveUri, { encoding: 'base64' });
    onProgress?.(0.25);

    const bytes = toByteArray(base64);
    onProgress?.(0.5);

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

// Placeholder para Expo Router
export default function __expo_router_placeholder__(): any {
  return null;
}

