import { supabase } from '@/app/shared/lib/supabase';

export interface CitizenProfile {
  usuario_id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  created_at: string;
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
    })) || [];    return {
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