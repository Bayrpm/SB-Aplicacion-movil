import { supabase } from '@/app/shared/lib/supabase';
import { validateAndNormalizeCoordinates } from '../lib/coordinatesUtils';
import type { ReportCategory } from '../types';

/**
 * Mapa por defecto de iconos para categorías conocidas.
 */
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

/**
 * Obtiene las categorías públicas.
 */
export async function fetchReportCategories(): Promise<ReportCategory[]> {
  try {
    const { data, error } = await supabase
      .from('categorias_publicas')
      .select('id, nombre, descripcion, orden, activo, created_at')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) {
return [];
    }
    if (!Array.isArray(data)) return [];

    return data.map((row: any, idx: number) => {
      const iconFromRow =
        typeof row.icon === 'string' && row.icon.trim() ? row.icon.trim() : undefined;
      const icon = iconFromRow ?? DEFAULT_ICON_MAP[row.id as number];

      const cat: ReportCategory = {
        idx,
        id: Number(row.id),
        nombre: String(row.nombre ?? ''),
        descripcion: String(row.descripcion ?? ''),
        orden: Number(row.orden ?? idx),
        activo: Boolean(row.activo),
        icon,
      };
      return cat;
    });
  } catch {
    return [];
  }
}

// Para compatibilidad con Expo Router (no es una ruta)
export default function _ReportApiRoute(): null {
  return null;
}

/**
 * Obtiene denuncias públicas recientes (últimas 24h).
 * Usa RPC 'get_denuncias_publicas_recientes' (server-side time).
 * Las coordenadas se normalizan automáticamente para Google Maps API.
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
    if (error) {
return [];
    }
    if (!Array.isArray(data)) return [];

    return data.map((row: any) => {
      // Normalizar coordenadas para Google Maps API
      const validation = validateAndNormalizeCoordinates(
        Number(row.coords_x),
        Number(row.coords_y)
      );

      // Si las coordenadas fueron convertidas o son inválidas, loguear para debugging
      if (validation.wasConverted) {
}
      if (!validation.isValid) {
}

      return {
        id: String(row.id),
        titulo: String(row.titulo ?? ''),
        descripcion: String(row.descripcion ?? ''),
        // Usar coordenadas normalizadas
        coords_x: validation.coordinates.latitude,
        coords_y: validation.coordinates.longitude,
        categoria_publica_id: row.categoria_publica_id != null ? Number(row.categoria_publica_id) : null,
        fecha_creacion: String(row.fecha_creacion ?? ''),
        ubicacion_texto: row.ubicacion_texto ? String(row.ubicacion_texto) : null,
        anonimo: Boolean(row.anonimo),
        ciudadano: row.ciudadano ?? null,
      };
    });
  } catch (e) {
return [];
  }
}

/**
 * Haversine: distancia en metros entre dos coordenadas.
 */
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

/**
 * Verifica si ya existe una denuncia reciente (24h) del mismo ciudadano y categoría
 * a <= radio_metros de distancia. Usa RPC 'get_recent_reports_by_category'.
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
    if (error) {
return false;
    }
    if (!Array.isArray(data) || data.length === 0) return false;

    for (const d of data) {
      if (d.coords_x && d.coords_y) {
        const dist = calculateDistance(coords_x, coords_y, d.coords_x, d.coords_y);
        if (dist <= radio_metros) return true;
      }
    }
    return false;
  } catch (e) {
return false;
  }
}

/**
 * Detalle de denuncia pública por id (respeta anonimato).
 * Usa RPC 'get_denuncia_publica_detalle'.
 * Las coordenadas se normalizan automáticamente para Google Maps API.
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

  if (error) {
throw error;
  }
  if (!data) throw new Error('No se encontró la denuncia o no es pública');

  // Cast explícito para TypeScript (RPC retorna un objeto dinámico)
  const row = data as any;
  const ciudadano = row.ciudadano ?? undefined;

  // Normalizar coordenadas para Google Maps API
  const validation = validateAndNormalizeCoordinates(
    Number(row.coords_x),
    Number(row.coords_y)
  );

  if (validation.wasConverted) {
}
  if (!validation.isValid) {
}

  return {
    id: String(row.id),
    folio: row.folio ? String(row.folio) : null,
    titulo: String(row.titulo ?? ''),
    descripcion: String(row.descripcion ?? ''),
    // Usar coordenadas normalizadas
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
 * Crea una nueva denuncia en `denuncias`.
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
    const anon = Boolean(payload.anonimo);
    const ubicacion_texto = payload.ubicacion_texto ?? null;

    let coords_x: number | null = null;
    let coords_y: number | null = null;
    if (typeof payload.coords_x === 'number' && Number.isFinite(payload.coords_x)) {
      coords_x = Number(payload.coords_x.toFixed(6));
    }
    if (typeof payload.coords_y === 'number' && Number.isFinite(payload.coords_y)) {
      coords_y = Number(payload.coords_y.toFixed(6));
    }

    const insertObj: any = {
      ciudadano_id: payload.ciudadano_id,
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      anonimo: anon,
      ubicacion_texto,
      coords_x: coords_x ?? null,
      coords_y: coords_y ?? null,
      categoria_publica_id: payload.categoria_publica_id ?? null,
    };

    // Validación defensiva: requerir texto de ubicación y coordenadas
    if (!ubicacion_texto || coords_x == null || coords_y == null) {
      return { data: null, error: new Error('Ubicación incompleta: se requiere `ubicacion_texto` y coordenadas (coords_x, coords_y) para crear la denuncia') };
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'estado_id')) insertObj.estado_id = payload.estado_id;
    if (Object.prototype.hasOwnProperty.call(payload, 'inspector_id')) insertObj.inspector_id = payload.inspector_id;
    if (Object.prototype.hasOwnProperty.call(payload, 'consentir_publicacion')) insertObj.consentir_publicacion = payload.consentir_publicacion;
    if (Object.prototype.hasOwnProperty.call(payload, 'prioridad')) insertObj.prioridad = payload.prioridad;
    if (Object.prototype.hasOwnProperty.call(payload, 'cuadrante_id')) insertObj.cuadrante_id = payload.cuadrante_id;

    const { data, error } = await supabase.from('denuncias').insert(insertObj).select('*');
    if (error) {
return { data: null, error };
    }
    return { data, error: null };
  } catch (e) {
return { data: null, error: e };
  }
}

/**
 * Obtiene estadísticas y la reacción del usuario actual para una denuncia.
 */
export async function fetchReportStats(reportId: string): Promise<{
  likes: number;
  dislikes: number;
  userReaction: 'LIKE' | 'DISLIKE' | null;
  commentsCount: number;
}> {
  try {
    // stats agregados (vista)
    const { data: statsData, error: statsErr } = await supabase
      .from('v_denuncia_reacciones_stats')
      .select('*')
      .eq('denuncia_id', reportId)
      .maybeSingle();

    if (statsErr) {
}

    // contar comentarios (vista pública)
    const { data: comments, error: commentsErr } = await supabase
      .from('v_denuncia_comentarios_publicos')
      .select('id', { count: 'estimated' })
      .eq('denuncia_id', reportId);

    if (commentsErr) {
}

    // reacción del usuario actual
    const { data: userData } = await supabase.auth.getUser();
    let userReaction: 'LIKE' | 'DISLIKE' | null = null;
    if (userData?.user) {
      const { data: r, error: rErr } = await supabase
        .from('denuncia_reacciones')
        .select('tipo')
        .eq('denuncia_id', reportId)
        .eq('usuario_id', userData.user.id)
        .maybeSingle();
      if (!rErr && r && r.tipo) userReaction = String(r.tipo).toUpperCase() === 'LIKE' ? 'LIKE' : 'DISLIKE';
    }

    const likes = statsData?.likes ?? 0;
    const dislikes = statsData?.dislikes ?? 0;
    const commentsCount = Array.isArray(comments) ? comments.length : 0;

    return { likes, dislikes, userReaction, commentsCount };
  } catch (e) {
return { likes: 0, dislikes: 0, userReaction: null, commentsCount: 0 };
  }
}

/**
 * Ejecuta la RPC que crea/actualiza una reacción (fn_denuncia_reaccionar)
 */
export async function reactToReport(reportId: string, tipo: 'LIKE' | 'DISLIKE') {
  try {
    const { data, error } = await supabase.rpc('fn_denuncia_reaccionar', { p_denuncia_id: reportId, p_tipo: tipo });
    if (error) {
return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
return { data: null, error: err };
  }
}

/**
 * Obtiene la lista de comentarios (vista pública) para una denuncia
 */
export async function fetchReportComments(reportId: string) {
  try {
    // Intentar primero solicitando parent_id
    try {
      const { data, error } = await supabase
        .from('v_denuncia_comentarios_publicos')
        // pedimos parent_id si existe en la vista/tabla para soportar respuestas
        .select('id, denuncia_id, usuario_id, autor, anonimo, autor_visible, contenido, created_at, parent_id')
        .eq('denuncia_id', reportId)
        .order('created_at', { ascending: false });

      if (error) {
        if ((error as any)?.code === '42703') {
          // Reintentar sin parent_id
          const { data: data2, error: error2 } = await supabase
            .from('v_denuncia_comentarios_publicos')
            .select('id, denuncia_id, usuario_id, autor, anonimo, autor_visible, contenido, created_at')
            .eq('denuncia_id', reportId)
            .order('created_at', { ascending: false });
          if (error2) {
return [];
          }
          return (data2 ?? []) as any[];
        }
return [];
      }

      // Merge comment reaction stats (if view exists) to supply likes/liked per comment
      try {
        const rows = (data ?? []) as any[];

        // Fetch avatar_url for any known usuario_id from perfiles_ciudadanos so UI can show avatars
        try {
          const userIds = Array.from(new Set(rows.map((r: any) => r.usuario_id).filter(Boolean)));
          if (userIds.length > 0) {
            const { data: profiles } = await supabase.from('perfiles_ciudadanos').select('usuario_id, avatar_url').in('usuario_id', userIds as any[]);
            const avatarMap: Record<string, string> = {};
            (profiles || []).forEach((p: any) => { if (p && p.usuario_id) avatarMap[String(p.usuario_id)] = p.avatar_url ?? null; });
            // attach avatar_url to rows if not present
            rows.forEach((r: any) => {
              if (!r.avatar_url && r.usuario_id && avatarMap[String(r.usuario_id)]) r.avatar_url = avatarMap[String(r.usuario_id)];
            });
          }
        } catch {
          // ignore avatar enrichment errors
        }

        // Try view first
        try {
          const { data: statsData, error: statsErr } = await supabase
            .from('v_comentario_reacciones_stats')
            .select('comentario_id, likes, user_reaction')
            .eq('denuncia_id', reportId);
          if (!statsErr && Array.isArray(statsData) && statsData.length > 0) {
            const statsMap: Record<string, any> = {};
            statsData.forEach((s: any) => { statsMap[String(s.comentario_id)] = s; });
            return rows.map((r: any) => ({ ...r, likes: statsMap[String(r.id)]?.likes ?? r.likes, liked: (statsMap[String(r.id)]?.user_reaction ?? '').toUpperCase() === 'LIKE' || !!r.liked }));
          }
        } catch {
          // fall through to table aggregation
        }

        // Fallback: aggregate directly from comentario_reacciones table
        try {
          const commentIds = rows.map((r: any) => Number(r.id)).filter((v) => Number.isFinite(v));
          if (commentIds.length === 0) return rows;

          // Get all reactions for these comments
          const { data: reactions, error: reactionsErr } = await supabase
            .from('comentario_reacciones')
            .select('comentario_id, tipo, usuario_id')
            .in('comentario_id', commentIds as any[]);

          if (reactionsErr || !Array.isArray(reactions)) return rows;

          const likesMap: Record<string, number> = {};
          reactions.forEach((r: any) => {
            if ((r.tipo ?? '').toUpperCase() === 'LIKE') likesMap[String(r.comentario_id)] = (likesMap[String(r.comentario_id)] || 0) + 1;
          });

          // Determine current user reactions (if authenticated)
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData?.user?.id ?? null;
          const userReactionMap: Record<string, string | null> = {};
          if (userId) {
            const { data: userReacts, error: urErr } = await supabase
              .from('comentario_reacciones')
              .select('comentario_id, tipo')
              .eq('usuario_id', userId)
              .in('comentario_id', commentIds as any[]);
            if (!urErr && Array.isArray(userReacts)) {
              userReacts.forEach((ur: any) => { userReactionMap[String(ur.comentario_id)] = (ur.tipo ?? '').toUpperCase(); });
            }
          }

          return rows.map((r: any) => ({
            ...r,
            likes: likesMap[String(r.id)] ?? r.likes ?? 0,
            liked: (userReactionMap[String(r.id)] ?? '').toUpperCase() === 'LIKE' || !!r.liked,
          }));
        } catch {
          return rows;
        }
      } catch {
        return (data ?? []) as any[];
      }
    } catch (inner) {
return [];
    }
  } catch (e) {
return [];
  }
}

/**
 * Crea un comentario en la tabla `comentarios_denuncias`.
 */
export async function createReportComment(reportId: string, contenido: string, anonimo: boolean = true, parentId?: number | null) {
  try {
    const insertObj: any = { denuncia_id: reportId, contenido, anonimo };
    // if parent_id provided by caller, include it
    if (parentId != null) insertObj.parent_id = parentId;

    // Intentar insertar; si falla por ausencia de columna parent_id (PGRST204), reintentar sin esa propiedad
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
      if (parentId != null && (String(code) === 'PGRST204' || msg.includes('parent_id') || (msg.includes('column') && msg.includes('parent_id')))) {
        // Reintentar sin parent_id
        const insertFallback: any = { denuncia_id: reportId, contenido, anonimo };
        const { data: data2, error: error2 } = await supabase.from('comentarios_denuncias').insert(insertFallback).select().maybeSingle();
        if (error2) {
return { data: null, error: error2 };
        }
        return { data: data2, error: null };
      }
return { data: null, error };
    }

    return { data, error: null };
  } catch (e) {
return { data: null, error: e };
  }
}

/** Llama a la RPC fn_comentario_reaccionar(p_comentario_id, p_tipo) para crear/actualizar reacción sobre un comentario */
export async function reactToComment(commentId: number, tipo: 'LIKE' | 'DISLIKE') {
  try {
    const { data, error } = await supabase.rpc('fn_comentario_reaccionar', { p_comentario_id: commentId, p_tipo: tipo });
    if (error) {
return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
return { data: null, error: err };
  }
}

/**
 * Actualiza el contenido de un comentario (solo autor) y solo si fue creado hace <= 1 hora.
 * Retorna { data, error } donde data es el comentario actualizado.
 */
export async function updateReportComment(commentId: number | string, newContenido: string) {
  try {
    const idNum = Number(commentId);
    if (!Number.isFinite(idNum)) return { data: null, error: new Error('commentId inválido') };
    // Intentar primero una RPC personalizada (recomendado si hay RLS/policies que impiden updates directos)
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('fn_update_comentario_denuncia', { p_comentario_id: idNum, p_contenido: newContenido });
      if (!rpcErr) return { data: rpcData, error: null };
      // Si la RPC devuelve error, decidimos cuándo propagar y cuándo intentar fallback.
      // Permitir fallback cuando la RPC no existe (42883) o cuando la función falla por ambigüedad de columnas (42702)
      const code = (rpcErr as any)?.code ?? '';
      const msg = String(rpcErr?.message ?? '').toLowerCase();
      const fallbackable = code === '42883' || code === '42702' || msg.includes('does not exist') || msg.includes('undefined function') || msg.includes('ambiguous') || msg.includes('column reference');
      if (!fallbackable) {
        // RPC devolvió un error que no queremos ocultar
return { data: null, error: rpcErr };
      }
      // Si es fallbackable, continuamos al flujo directo
    } catch {
      // ignore and fallback to direct update
    }

    // Obtener comentario existente (fallback directo)
    const { data: existing, error: fetchErr } = await supabase
      .from('comentarios_denuncias')
      .select('id, usuario_id, created_at, contenido')
      .eq('id', idNum)
      .maybeSingle();

    if (fetchErr) {
return { data: null, error: fetchErr };
    }
    if (!existing) return { data: null, error: new Error('Comentario no encontrado') };

    // Verificar usuario autenticado
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData?.user?.id ?? null;
    if (!currentUserId) return { data: null, error: new Error('No autenticado') };

    if (String(existing.usuario_id) !== String(currentUserId)) {
      return { data: null, error: new Error('No autorizado: no eres el autor del comentario') };
    }

    // Verificar ventana de edición (1 hora desde created_at)
    try {
      const created = new Date(String(existing.created_at));
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const ONE_HOUR_MS = 60 * 60 * 1000;
      if (diffMs > ONE_HOUR_MS) {
        return { data: null, error: new Error('La ventana de edición de 1 hora expiró') };
      }
    } catch {
      // Si no podemos parsear la fecha, bloquear la edición por seguridad
      return { data: null, error: new Error('No se pudo verificar la fecha de creación del comentario') };
    }

    // Realizar la actualización directa (puede fallar si hay policies mal diseñadas)
    const { data: updated, error: updateErr } = await supabase
      .from('comentarios_denuncias')
      .update({ contenido: newContenido })
      .eq('id', idNum)
      .select()
      .maybeSingle();

    if (updateErr) {
// Detectar política de recursión y dar mensaje más claro
      if ((updateErr as any)?.code === '42P17' || String(updateErr?.message ?? '').toLowerCase().includes('infinite recursion')) {
        return { data: null, error: new Error('Error de políticas en el servidor: recursion infinita detectada en policy para comentarios_denuncias. Crea una RPC segura (SECURITY DEFINER) para actualizar comentarios o ajusta las políticas RLS.') };
      }
      return { data: null, error: updateErr };
    }
    return { data: updated, error: null };
  } catch (err) {
return { data: null, error: err };
  }
}

/**
 * Elimina un comentario. Solo puede eliminarlo su autor (sin límite de tiempo) o un usuario con permisos.
 */
export async function deleteReportComment(commentId: number | string) {
  try {
    const idNum = Number(commentId);
    if (!Number.isFinite(idNum)) return { data: null, error: new Error('commentId inválido') };
    // Intentar RPC seguro primero
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('fn_delete_comentario_denuncia', { p_comentario_id: idNum });
      if (!rpcErr) return { data: rpcData, error: null };
      const msg = String(rpcErr?.message ?? '').toLowerCase();
      if (!(msg.includes('does not exist') || msg.includes('undefined function') || (rpcErr as any)?.code === '42883')) {
return { data: null, error: rpcErr };
      }
      // Si no existe la RPC, continuar con flujo directo
    } catch {
      // ignore and fallback
    }

    // Fallback directo
    // Obtener comentario existente
    const { data: existing, error: fetchErr } = await supabase
      .from('comentarios_denuncias')
      .select('id, usuario_id')
      .eq('id', idNum)
      .maybeSingle();

    if (fetchErr) {
return { data: null, error: fetchErr };
    }
    if (!existing) return { data: null, error: new Error('Comentario no encontrado') };

    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData?.user?.id ?? null;
    if (!currentUserId) return { data: null, error: new Error('No autenticado') };

    if (String(existing.usuario_id) !== String(currentUserId)) {
      return { data: null, error: new Error('No autorizado: no eres el autor del comentario') };
    }

    // Ejecutar borrado directo
    const { data: deleted, error: delErr } = await supabase
      .from('comentarios_denuncias')
      .delete()
      .eq('id', idNum)
      .select()
      .maybeSingle();

    if (delErr) {
if ((delErr as any)?.code === '42P17' || String(delErr?.message ?? '').toLowerCase().includes('infinite recursion')) {
        return { data: null, error: new Error('Error de políticas en el servidor: recursion infinita detectada en policy para comentarios_denuncias. Crea una RPC segura (SECURITY DEFINER) para eliminar comentarios o ajusta las políticas RLS.') };
      }
      return { data: null, error: delErr };
    }
    return { data: deleted, error: null };
  } catch (err) {
return { data: null, error: err };
  }
}
