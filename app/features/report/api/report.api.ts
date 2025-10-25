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
}) {
  try {
    const insertObj: any = {
      ciudadano_id: payload.ciudadano_id,
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      anonimo: payload.anonimo,
      ubicacion_texto: payload.ubicacion_texto ?? null,
      coords_x: payload.coords_x ?? null,
      coords_y: payload.coords_y ?? null,
      categoria_publica_id: payload.categoria_publica_id ?? null,
    };

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
