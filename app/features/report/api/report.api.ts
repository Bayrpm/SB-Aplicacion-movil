import { supabase } from '@/app/shared/lib/supabase';
import type { ReportCategory } from '../types';

/**
 * Mapa por defecto de iconos para categorías conocidas.
 * Si la BDD incluye un campo icon (o si se asigna posteriormente), ese valor
 * tendrá prioridad. Este mapa es un respaldo para mantener compatibilidad
 * con las categorías existentes en la app.
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
 * Obtiene las categorías públicas desde la tabla `categorias_publicas`.
 * - Solo devuelve las categorías con `activo = true`.
 * - Ordena por `orden` asc.
 * - Normaliza el resultado al tipo ReportCategory y añade un campo `icon`
 *   usando, por orden de preferencia: el propio campo `icon` de la fila (si existe),
 *   o el `DEFAULT_ICON_MAP` por id.
 */
export async function fetchReportCategories(): Promise<ReportCategory[]> {
  try {
    // No solicitamos `icon` aquí porque la columna puede no existir en la DB.
    // Si en el futuro se añade la columna `icon`, cambiar a
    // `.select('id, nombre, descripcion, orden, activo, created_at, icon')`
    // o actualizar la query según sea necesario.
    const { data, error } = await supabase
      .from('categorias_publicas')
      .select('id, nombre, descripcion, orden, activo, created_at')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) {
      // Si hay error, no tiramos — devolvemos array vacío para que el caller
      // pueda manejar el fallback apropiado.
      console.warn('fetchReportCategories supabase error', error);
      return [];
    }

    if (!Array.isArray(data)) return [];

    return data.map((row: any, idx: number) => {
      const iconFromRow = typeof row.icon === 'string' && row.icon.trim() ? row.icon.trim() : undefined;
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
  } catch (e) {
    return [];
  }
}

// Para compatibilidad con Expo Router (no es una ruta)
export default function _ReportApiRoute(): null {
  return null;
}

/**
 * Obtiene las denuncias públicas (consentir_publicacion = true) con coordenadas válidas.
 * - Solo devuelve denuncias que tienen coords_x y coords_y (no null).
 * - Filtra por consentir_publicacion = true.
 * - Excluye denuncias en estado "Cerrada".
 * - Solo denuncias creadas en las últimas 24 horas (desde su fecha_creacion según hora del servidor).
 * - Ordena por fecha_creacion desc (más recientes primero).
 * 
 * IMPORTANTE: Requiere la función RPC 'get_denuncias_publicas_recientes' en Supabase.
 * Ver documentación al final del archivo para crear la función.
 */
export async function fetchPublicReports(): Promise<Array<{
  id: string;
  titulo: string;
  descripcion: string;
  coords_x: number;
  coords_y: number;
  categoria_publica_id: number | null;
  fecha_creacion: string;
  ubicacion_texto: string | null;
}>> {
  try {
    // Usar función RPC que filtra por hora del servidor (24 horas desde fecha_creacion)
    const { data, error } = await supabase.rpc('get_denuncias_publicas_recientes');

    if (error) {
      console.warn('fetchPublicReports supabase error', error);
      return [];
    }

    if (!Array.isArray(data)) return [];

    return data.map((row: any) => ({
      id: String(row.id),
      titulo: String(row.titulo ?? ''),
      descripcion: String(row.descripcion ?? ''),
      coords_x: Number(row.coords_x),
      coords_y: Number(row.coords_y),
      categoria_publica_id: row.categoria_publica_id ? Number(row.categoria_publica_id) : null,
      fecha_creacion: String(row.fecha_creacion ?? ''),
      ubicacion_texto: row.ubicacion_texto ? String(row.ubicacion_texto) : null,
    }));
  } catch (e) {
    console.warn('fetchPublicReports exception', e);
    return [];
  }
}

/**
 * Calcula la distancia en metros entre dos coordenadas GPS usando la fórmula de Haversine
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distancia en metros

  return distance;
}

/**
 * Verifica si el ciudadano ya tiene una denuncia reciente de la misma categoría
 * EN LA MISMA UBICACIÓN (radio de 30 metros) en las últimas 24 horas.
 * 
 * La validación de proximidad se hace en la app (más eficiente).
 * Solo usa el servidor para filtrar por tiempo (24h) y evitar manipulación del reloj.
 * 
 * IMPORTANTE: Requiere la función RPC 'get_recent_reports_by_category' en Supabase.
 */
export async function checkRecentReportByCategory(
  ciudadano_id: string,
  categoria_publica_id: number,
  coords_x: number,
  coords_y: number,
  radio_metros: number = 30
): Promise<boolean> {
  try {
    // Obtener denuncias recientes del mismo ciudadano y categoría (últimas 24h desde servidor)
    const { data, error } = await supabase.rpc('get_recent_reports_by_category', {
      p_ciudadano_id: ciudadano_id,
      p_categoria_publica_id: categoria_publica_id,
    });

    if (error) {
      console.warn('checkRecentReportByCategory error', error);
      return false; // en caso de error, permitir la denuncia (evitar bloqueo falso)
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return false;
    }

    // Verificar si alguna denuncia está dentro del radio de proximidad
    for (const denuncia of data) {
      if (denuncia.coords_x && denuncia.coords_y) {
        const distancia = calculateDistance(
          coords_x,
          coords_y,
          denuncia.coords_x,
          denuncia.coords_y
        );

        if (distancia <= radio_metros) {
          return true;
        }
      }
    }

    return false;
  } catch (e) {
    console.warn('checkRecentReportByCategory exception', e);
    return false;
  }
}

/**
 * Obtiene el detalle de una denuncia pública por id (consentir_publicacion = true)
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
  ciudadano?: {
    nombre?: string;
    apellido?: string;
  };
}> {
  try {
    // Usar perfiles_ciudadanos según el hint de Supabase
    const { data, error } = await supabase
      .from('denuncias')
      .select('id, folio, titulo, descripcion, coords_x, coords_y, categoria_publica_id, fecha_creacion, ubicacion_texto, anonimo, consentir_publicacion, perfiles_ciudadanos(nombre, apellido)')
      .eq('id', id)
      .eq('consentir_publicacion', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('fetchPublicReportDetail supabase error', error);
      throw error;
    }
    if (!data) {
      throw new Error('No se encontró la denuncia o no es pública');
    }

    // Extraer datos del perfil ciudadano
    const ciudadanoData = (data as any).perfiles_ciudadanos;

    return {
      id: String(data.id),
      folio: data.folio ? String(data.folio) : null,
      titulo: String(data.titulo ?? ''),
      descripcion: String(data.descripcion ?? ''),
      coords_x: Number(data.coords_x),
      coords_y: Number(data.coords_y),
      categoria_publica_id: data.categoria_publica_id ? Number(data.categoria_publica_id) : null,
      fecha_creacion: String(data.fecha_creacion ?? ''),
      ubicacion_texto: data.ubicacion_texto ? String(data.ubicacion_texto) : null,
      anonimo: Boolean(data.anonimo),
      ciudadano: ciudadanoData ? {
        nombre: String(ciudadanoData.nombre ?? ''),
        apellido: String(ciudadanoData.apellido ?? ''),
      } : undefined,
    };
  } catch (e) {
    throw e;
  }
}

/**
 * Crea una nueva denuncia en la tabla `denuncias`.
 * Se intenta insertar únicamente los campos que la app móvil provee.
 * La función devuelve `{ data, error }` tal como devuelve supabase.
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
  // optional administrative fields - when available include them
  estado_id?: number | null;
  inspector_id?: number | null;
  consentir_publicacion?: boolean | null;
  prioridad?: string | null;
  cuadrante_id?: number | null;
}) {
  try {
    // Normalize fields to match DB expectations
    const anon = Boolean(payload.anonimo);
    const ubicacion_texto = payload.ubicacion_texto ?? null;

    // DB now uses double precision (float8) for coords_x/coords_y. We accept
    // real lat/lon values and round to 6 decimals before inserting.
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

    // Include optional administrative fields only when explicitly provided
    if (Object.prototype.hasOwnProperty.call(payload, 'estado_id')) insertObj.estado_id = payload.estado_id;
    if (Object.prototype.hasOwnProperty.call(payload, 'inspector_id')) insertObj.inspector_id = payload.inspector_id;
    if (Object.prototype.hasOwnProperty.call(payload, 'consentir_publicacion')) insertObj.consentir_publicacion = payload.consentir_publicacion;
    if (Object.prototype.hasOwnProperty.call(payload, 'prioridad')) insertObj.prioridad = payload.prioridad;
    if (Object.prototype.hasOwnProperty.call(payload, 'cuadrante_id')) insertObj.cuadrante_id = payload.cuadrante_id;

    const { data, error } = await supabase.from('denuncias').insert(insertObj).select('*');
    if (error) {
      console.warn('createReport supabase error', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (e) {
    console.warn('createReport exception', e);
    return { data: null, error: e };
  }
}