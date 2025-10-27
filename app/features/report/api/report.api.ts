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
