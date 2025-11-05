import { supabase } from '@/app/shared/lib/supabase';
// Usar la API legacy para readAsStringAsync para evitar warnings deprecados en esta versión de Expo

// Helper: convertir base64 a Uint8Array compatible con RN/Node
function base64ToUint8Array(base64: string): Uint8Array {
  // Si existe Buffer (Node o polyfill), usarlo
  try {
    // @ts-ignore
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
      // @ts-ignore
      return Uint8Array.from(Buffer.from(base64, 'base64'));
    }
  } catch (e) {
    // continuar al fallback
  }

  // Si existe atob, usarlo
  const atobFn = (globalThis as any).atob || (typeof atob === 'function' ? atob : null);
  if (atobFn) {
    const binaryString = atobFn(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

  // Último recurso: decodificar manualmente
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = '';
  let output = [] as number[];
  let buffer = 0, bits = 0;
  for (let i = 0; i < base64.length; i++) {
    const c = base64.charAt(i);
    const val = chars.indexOf(c);
    if (val === -1) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(output);
}

export interface CitizenProfile {
  usuario_id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  created_at: string;
  avatar_url?: string | null;
}

export interface CitizenReport {
  id: string;
  folio?: string | number;
  titulo: string;
  descripcion: string | null;
  ubicacion_texto: string | null;
  fecha_creacion: string;
  categoria_publica_id: number | null;
  estado_id: number;
  anonimo: boolean;
  coords_x: number | null;
  coords_y: number | null;
  likes_count?: number;
  imagenes_url?: string[] | null;
  categoria?: {
    nombre: string;
    id: number;
  } | null;
  estado?: {
    nombre: string;
  } | null;
  ciudadano?: {
    nombre: string | null;
    apellido: string | null;
    email: string | null;
    telefono: string | null;
  } | null;
}

/**
 * Obtiene el perfil del ciudadano actual
 * @returns Perfil del ciudadano o null si no existe
 */
export async function getCitizenProfile(): Promise<{
  data: CitizenProfile | null;
  error: string | null;
}> {
  try {
    // Obtener el usuario autenticado
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return {
        data: null,
        error: 'Usuario no autenticado',
      };
    }

    // Obtener el perfil del ciudadano
    const { data, error } = await supabase
      .from('perfiles_ciudadanos')
      .select('*')
      .eq('usuario_id', userData.user.id)
      .single();

    if (error) {
      console.error('Error al obtener perfil del ciudadano:', error);
      return {
        data: null,
        error: error.message || 'Error al obtener el perfil',
      };
    }

    return {
      data,
      error: null,
    };
  } catch (error: any) {
    console.error('Error inesperado al obtener perfil:', error);
    return {
      data: null,
      error: error?.message || 'Error inesperado',
    };
  }
}

/**
 * Actualiza el perfil del ciudadano actual
 * @param updates Campos a actualizar (nombre, apellido, telefono, email)
 * @returns Perfil actualizado o error
 */
export async function updateCitizenProfile(updates: {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  email?: string;
}): Promise<{
  data: CitizenProfile | null;
  error: string | null;
}> {
  try {
    // Obtener el usuario autenticado
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return {
        data: null,
        error: 'Usuario no autenticado',
      };
    }

    // Si se está actualizando el email, primero actualizar en Supabase Auth
    if (updates.email && updates.email !== userData.user.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: updates.email,
      });

      if (emailError) {
        console.error('Error al actualizar email en Auth:', emailError);
        return {
          data: null,
          error: 'No se pudo actualizar el correo. Verifica que sea válido y no esté en uso.',
        };
      }
    }

    // Actualizar el perfil en la tabla perfiles_ciudadanos
    const { data, error } = await supabase
      .from('perfiles_ciudadanos')
      .update(updates)
      .eq('usuario_id', userData.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar perfil:', error);
      return {
        data: null,
        error: error.message || 'Error al actualizar el perfil',
      };
    }

    return {
      data,
      error: null,
    };
  } catch (error: any) {
    console.error('Error inesperado al actualizar perfil:', error);
    return {
      data: null,
      error: error?.message || 'Error inesperado',
    };
  }
}


/**
 * Obtiene las denuncias del ciudadano actual
 * @param limit Límite de resultados (por defecto 5)
 * @param offset Desplazamiento para paginación (por defecto 0)
 * @param orderBy Ordenar por 'fecha_desc' o 'fecha_asc' (por defecto 'fecha_desc')
 * @param categoryId Filtrar por categoría (opcional)
 * @param estadoId Filtrar por estado (opcional)
 * @returns Lista de denuncias del ciudadano
 */
export async function getCitizenReports(
  limit: number = 5,
  offset: number = 0,
  orderBy: 'fecha_desc' | 'fecha_asc' = 'fecha_desc',
  categoryId?: number | null,
  estadoId?: number | null
): Promise<{
  data: CitizenReport[] | null;
  error: string | null;
  hasMore: boolean;
}> {
  try {
    // Obtener el usuario autenticado
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return {
        data: null,
        error: 'Usuario no autenticado',
        hasMore: false,
      };
    }

    // Construir query con joins a categorias_publicas, estados_denuncia y perfiles_ciudadanos
    let query = supabase
      .from('denuncias')
      .select(`
        id,
        folio,
        titulo,
        descripcion,
        ubicacion_texto,
        fecha_creacion,
        categoria_publica_id,
        estado_id,
        anonimo,
        coords_x,
        coords_y,
        categoria:categorias_publicas(id, nombre),
        estado:estados_denuncia(nombre),
        ciudadano:perfiles_ciudadanos(nombre, apellido, email, telefono)
      `)
      .eq('ciudadano_id', userData.user.id)
      .range(offset, offset + limit); // Pedimos uno extra para saber si hay más

    // Aplicar filtros opcionales
    if (categoryId !== undefined && categoryId !== null) {
      query = query.eq('categoria_publica_id', categoryId);
    }

    if (estadoId !== undefined && estadoId !== null) {
      query = query.eq('estado_id', estadoId);
    }

    // Ordenar por fecha
    if (orderBy === 'fecha_desc') {
      query = query.order('fecha_creacion', { ascending: false });
    } else {
      query = query.order('fecha_creacion', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener denuncias del ciudadano:', error);
      return {
        data: null,
        error: error.message || 'Error al obtener las denuncias',
        hasMore: false,
      };
    }

    // Verificar si hay más resultados
    const hasMore = data && data.length > limit;
    const resultData = hasMore ? data.slice(0, limit) : data;

    // Transformar los datos para que coincidan con la interfaz CitizenReport
    const reports: CitizenReport[] = resultData?.map((report) => ({
      id: report.id,
      folio: report.folio ?? undefined,
      titulo: report.titulo,
      descripcion: report.descripcion,
      ubicacion_texto: report.ubicacion_texto,
      fecha_creacion: report.fecha_creacion,
      categoria_publica_id: report.categoria_publica_id,
      estado_id: report.estado_id,
      anonimo: report.anonimo ?? false,
      coords_x: report.coords_x ?? null,
      coords_y: report.coords_y ?? null,
      imagenes_url: null, // La columna no existe en DB; usar null como placeholder
      likes_count: 0, // TODO: Implementar conteo de likes cuando exista la tabla
      // No usar fallback aquí - dejar null si no vino el join
      categoria: Array.isArray(report.categoria) && report.categoria.length > 0 && report.categoria[0].nombre
        ? report.categoria[0]
        : null,
      estado: Array.isArray(report.estado) && report.estado.length > 0 && report.estado[0].nombre
        ? report.estado[0]
        : null,
      ciudadano: Array.isArray(report.ciudadano) && report.ciudadano.length > 0
        ? report.ciudadano[0]
        : null,
    })) || []; return {
      data: reports,
      error: null,
      hasMore,
    };
  } catch (error: any) {
    console.error('Error inesperado al obtener denuncias:', error);
    return {
      data: null,
      error: error?.message || 'Error inesperado',
      hasMore: false,
    };
  }
}


/**
 * Obtiene todas las categorías públicas activas
 */
export async function getAllCategories(): Promise<{
  data: { id: number; nombre: string }[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('categorias_publicas')
      .select('id, nombre')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) {
      console.error('Error al obtener categorías:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Error inesperado al obtener categorías:', error);
    return { data: null, error: error?.message || 'Error inesperado' };
  }
}

/**
 * Obtiene todos los estados de denuncia
 */
export async function getAllEstados(): Promise<{
  data: { id: number; nombre: string }[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('estados_denuncia')
      .select('id, nombre')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error al obtener estados:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Error inesperado al obtener estados:', error);
    return { data: null, error: error?.message || 'Error inesperado' };
  }
}

/** Obtiene una categoría pública por ID (sin filtrar por activo) */
export async function getCategoryById(id: number): Promise<{
  data: { id: number; nombre: string } | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('categorias_publicas')
      .select('id, nombre')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as any, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Error inesperado' };
  }
}

/** Obtiene un estado de denuncia por ID */
export async function getEstadoById(id: number): Promise<{
  data: { id: number; nombre: string } | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('estados_denuncia')
      .select('id, nombre')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as any, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Error inesperado' };
  }
}

export default function __expo_router_placeholder__(): any {
  return null;
}

/**
 * Sube una imagen de avatar al bucket 'avatars' y actualiza la columna avatar_url
 */
export async function uploadCitizenAvatar(fileUri: string): Promise<{
  data: CitizenProfile | null;
  error: string | null;
}> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return { data: null, error: 'Usuario no autenticado' };

    const userId = userData.user.id;

    // Estrategia simple: fetch -> arrayBuffer -> Uint8Array
    // Esto funciona consistentemente en RN/Expo
    const response = await fetch(fileUri);
    if (!response.ok) {
      return { data: null, error: 'No se pudo leer el archivo de imagen' };
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Determinar extensión y contentType
    const extMatch = (fileUri || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const filePath = `${userId}/avatar_${Date.now()}.${ext}`;
    
    let contentType = 'image/jpeg';
    switch (ext) {
      case 'png': contentType = 'image/png'; break;
      case 'webp': contentType = 'image/webp'; break;
      case 'gif': contentType = 'image/gif'; break;
      case 'heic':
      case 'heif':
        contentType = 'image/heic'; break;
      default: contentType = 'image/jpeg';
    }

    // Subir usando Uint8Array (compatible con storage API)
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, bytes, { 
        upsert: true, 
        contentType 
      });

    if (uploadError) {
      console.error('Error al subir avatar:', uploadError);
      return { data: null, error: uploadError.message || 'Error al subir la imagen' };
    }

    // Obtener URL pública
    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const avatarUrl = publicUrlData.publicUrl;

    // Actualizar la columna avatar_url en perfiles_ciudadanos
    const { data, error } = await supabase
      .from('perfiles_ciudadanos')
      .update({ avatar_url: avatarUrl })
      .eq('usuario_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar avatar en perfil:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (e: any) {
    console.error('Error inesperado al subir avatar:', e);
    return { data: null, error: e?.message || 'Error inesperado' };
  }
}

// --- Comentarios y reacciones (utils para profileCitizen) ---
/** Obtiene estadísticas y reacción del usuario para una denuncia (reutilizable en profileCitizen) */
export async function fetchReportStats(reportId: string): Promise<{
  likes: number;
  dislikes: number;
  userReaction: 'LIKE'|'DISLIKE'|null;
  commentsCount: number;
}> {
  try {
    const { data: statsData } = await supabase.from('v_denuncia_reacciones_stats').select('*').eq('denuncia_id', reportId).maybeSingle();
    const { data: comments } = await supabase.from('v_denuncia_comentarios_publicos').select('id', { count: 'estimated' }).eq('denuncia_id', reportId);
    const { data: userData } = await supabase.auth.getUser();
    let userReaction: 'LIKE'|'DISLIKE'|null = null;
    if (userData?.user) {
      const { data: r } = await supabase.from('denuncia_reacciones').select('tipo').eq('denuncia_id', reportId).eq('usuario_id', userData.user.id).maybeSingle();
      if (r && r.tipo) userReaction = String(r.tipo).toUpperCase() === 'LIKE' ? 'LIKE' : 'DISLIKE';
    }
    const likes = statsData?.likes ?? 0;
    const dislikes = statsData?.dislikes ?? 0;
    const commentsCount = Array.isArray(comments) ? comments.length : 0;
    return { likes, dislikes, userReaction, commentsCount };
  } catch (e: any) {
    console.error('fetchReportStats profile.api exception', e);
    return { likes: 0, dislikes: 0, userReaction: null, commentsCount: 0 };
  }
}

/** Llama la RPC fn_denuncia_reaccionar para crear/actualizar la reacción del usuario */
export async function reactToReport(reportId: string, tipo: 'LIKE'|'DISLIKE') {
  try {
    const { data, error } = await supabase.rpc('fn_denuncia_reaccionar', { p_denuncia_id: reportId, p_tipo: tipo });
    if (error) return { data: null, error };
    return { data, error: null };
  } catch (e: any) {
    console.error('reactToReport profile.api exception', e);
    return { data: null, error: e };
  }
}

/** Obtiene comentarios (vista pública) para una denuncia */
export async function fetchReportComments(reportId: string) {
  try {
    // Intentar primero solicitando parent_id (si la vista lo expone)
    try {
      const { data, error } = await supabase
        .from('v_denuncia_comentarios_publicos')
        .select('id, denuncia_id, usuario_id, autor, anonimo, autor_visible, contenido, created_at, parent_id')
        .eq('denuncia_id', reportId)
        .order('created_at', { ascending: false });

      // Si la vista no tiene parent_id, Postgres/Supabase regresará error con code 42703
      if (error) {
        if ((error as any)?.code === '42703') {
          // Reintentar sin parent_id
          const { data: data2, error: error2 } = await supabase
            .from('v_denuncia_comentarios_publicos')
            .select('id, denuncia_id, usuario_id, autor, anonimo, autor_visible, contenido, created_at')
            .eq('denuncia_id', reportId)
            .order('created_at', { ascending: false });
          if (error2) {
            console.error('fetchReportComments profile.api error after fallback', error2);
            return [];
          }
          // Normalize: ensure parent_id absent => null on consumer
          return (data2 ?? []) as any[];
        }
        console.error('fetchReportComments profile.api error', error);
        return [];
      }

      // Merge comment reaction stats (if view exists) to supply likes/liked per comment
      try {
        const rows = (data ?? []) as any[];

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
        } catch (e) {
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
        } catch (e) {
          return rows;
        }
      } catch (e) {
        return (data ?? []) as any[];
      }
    } catch (inner) {
      console.error('fetchReportComments profile.api inner exception', inner);
      return [];
    }
  } catch (e: any) {
    console.error('fetchReportComments profile.api exception', e);
    return [];
  }
}

/** Crea un comentario en comentarios_denuncias */
export async function createReportComment(reportId: string, contenido: string, anonimo: boolean = true, parentId?: number | null) {
  try {
    const insertObj: any = { denuncia_id: reportId, contenido, anonimo };
    // Si nos pasan parentId lo incluimos
    if (parentId != null) insertObj.parent_id = parentId;
    // Intentar insertar; si falla por ausencia de columna parent_id (PGRST204), reintentar sin esa propiedad
    let res: any;
    try {
      res = await supabase.from('comentarios_denuncias').insert(insertObj).select().maybeSingle();
    } catch (e: any) {
      // Supabase client may throw; fallback to handling via response object
      res = e;
    }

    // Res puede ser { data, error } o una excepción. Normalizamos:
    const data = res?.data ?? null;
    const error = res?.error ?? (res?.message ? res : null);
    if (error) {
      const code = (error as any)?.code ?? (error as any)?.status ?? null;
      const msg = String((error as any)?.message ?? '').toLowerCase();
      if (parentId != null && (String(code) === 'PGRST204' || msg.includes('parent_id') || msg.includes('column') && msg.includes('parent_id'))) {
        // Reintentar sin parent_id
        const insertFallback: any = { denuncia_id: reportId, contenido, anonimo };
        const { data: data2, error: error2 } = await supabase.from('comentarios_denuncias').insert(insertFallback).select().maybeSingle();
        if (error2) {
          console.error('createReportComment profile.api error after fallback', error2);
          return { data: null, error: error2 };
        }
        return { data: data2, error: null };
      }
      console.error('createReportComment profile.api error', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (e: any) {
    console.error('createReportComment profile.api exception', e);
    return { data: null, error: e };
  }
}

/** Reaccionar a un comentario (RPC fn_comentario_reaccionar) */
export async function reactToComment(commentId: number, tipo: 'LIKE'|'DISLIKE') {
  try {
    const { data, error } = await supabase.rpc('fn_comentario_reaccionar', { p_comentario_id: commentId, p_tipo: tipo });
    if (error) {
      console.error('reactToComment profile.api error', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (e: any) {
    console.error('reactToComment profile.api exception', e);
    return { data: null, error: e };
  }
}