import { supabase } from '@/app/shared/lib/supabase';
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
      console.warn('fetchReportCategories supabase error', error);
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
  anonimo: boolean;
  ciudadano?: { nombre?: string; apellido?: string } | null;
}>> {
  try {
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
      categoria_publica_id: row.categoria_publica_id != null ? Number(row.categoria_publica_id) : null,
      fecha_creacion: String(row.fecha_creacion ?? ''),
      ubicacion_texto: row.ubicacion_texto ? String(row.ubicacion_texto) : null,
      anonimo: Boolean(row.anonimo),
      ciudadano: row.ciudadano ?? null,
    }));
  } catch (e) {
    console.warn('fetchPublicReports exception', e);
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
      console.warn('checkRecentReportByCategory error', error);
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
    console.warn('checkRecentReportByCategory exception', e);
    return false;
  }
}

/**
 * Detalle de denuncia pública por id (respeta anonimato).
 * Usa RPC 'get_denuncia_publica_detalle'.
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
    console.warn('fetchPublicReportDetail supabase error', error);
    throw error;
  }
  if (!data) throw new Error('No se encontró la denuncia o no es pública');

  // Cast explícito para TypeScript (RPC retorna un objeto dinámico)
  const row = data as any;
  const ciudadano = row.ciudadano ?? undefined;

  return {
    id: String(row.id),
    folio: row.folio ? String(row.folio) : null,
    titulo: String(row.titulo ?? ''),
    descripcion: String(row.descripcion ?? ''),
    coords_x: Number(row.coords_x),
    coords_y: Number(row.coords_y),
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
