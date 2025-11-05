import { supabase } from '@/app/shared/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PublicReportFeedParams {
  limit?: number;
  coords?: { lat: number; lon: number } | null;
  maxAgeHours?: number;
  radiusMeters?: number;
}

export async function fetchPublicReportsFeed({
  limit = 3,
  coords,
  maxAgeHours = 24,
  radiusMeters = 200,
}: PublicReportFeedParams): Promise<{ data: any[]; hasMore: boolean; error?: string }> {
  try {
    // instrumentación simple para medir latencia
    const start = Date.now();
    // si recibimos coords, intentamos consultar directamente la tabla con un
    // bounding-box para reducir la cantidad de filas transferidas desde el
    // servidor. Esto evita traer *todas* las denuncias públicas y filtrar en
    // el cliente, lo que puede ser muy lento en backend con muchos registros.
    let rpcResult: any[] | null = null;
    let fromResult: any[] | null = null;

    if (coords) {
      // calcular bounding box aproximado en grados
      const lat = coords.lat;
      const lon = coords.lon;
      const latDelta = radiusMeters / 111320; // metros por grado aprox
      const lonDelta = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180));
      const minLat = lat - latDelta;
      const maxLat = lat + latDelta;
      const minLon = lon - lonDelta;
      const maxLon = lon + lonDelta;

      const cutoff = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));

      const { data: rows, error } = await supabase
        .from('denuncias')
        .select('id, folio, titulo, descripcion, ubicacion_texto, coords_x, coords_y, fecha_creacion, anonimo, categoria_publica_id')
        .gte('fecha_creacion', cutoff.toISOString())
        .eq('es_publica', true)
        .gte('coords_x', minLat)
        .lte('coords_x', maxLat)
        .gte('coords_y', minLon)
        .lte('coords_y', maxLon)
        .order('fecha_creacion', { ascending: false })
        .limit(limit * 3); // traer algo más por si el haversine filtra

      if (error) {
        // si falla la consulta directa, caemos al RPC como fallback
      } else {
        fromResult = rows ?? [];
      }
    }

    if (!fromResult) {
      const { data: rpc, error } = await supabase.rpc('get_denuncias_publicas_recientes');
      if (error) {
        return { data: [], hasMore: false, error: error.message };
      }
      rpcResult = rpc ?? [];
    }

    // 2) Filtro adicional por edad si pides algo distinto a 24h (cuando viene del rpc)
    
    // 3) Filtrar por radio en el cliente y mapear shape estable
    const sourceRows = fromResult ?? rpcResult ?? [];
    const rows = (sourceRows ?? [])
      .filter((r: any) => {
        if (maxAgeHours !== 24) {
          const ts = new Date(r.fecha_creacion);
          const cutoff2 = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
          if (ts < cutoff2) return false;
        }
        if (!coords) return true; // si no hay coords, no filtramos por distancia
        if (r.coords_x == null || r.coords_y == null) return false;
        const d = haversineDistance(coords.lat, coords.lon, r.coords_x, r.coords_y);
        return d <= radiusMeters;
      })
      .map((r: any) => ({
        id: String(r.id),
        folio: r.folio ?? null,
        titulo: r.titulo ?? '',
        descripcion: r.descripcion ?? '',
        ubicacion_texto: r.ubicacion_texto ?? null,
        coords_x: Number(r.coords_x),
        coords_y: Number(r.coords_y),
        fecha_creacion: r.fecha_creacion,
        anonimo: !!r.anonimo,
        categoria_publica_id: r.categoria_publica_id ?? null,

        // Campos “compatibles” con tu UI actual:
        categoria: null,          // si necesitas nombre de categoría, lo puedes pedir aparte
        estado: null,             // idem estado
        ciudadano: r.anonimo ? null : (r.ciudadano ?? null), // la RPC ya respeta anonimato
      }));

    // 4) Paginación simple en el cliente
    const items = rows.slice(0, limit);
    const hasMore = rows.length > limit;

  // instrumentación: medir duración (silenciada en producción)
  const ms = Date.now() - start;
    return { data: items, hasMore };
  } catch (e: any) {
    return { data: [], hasMore: false, error: e?.message || 'Error desconocido' };
  }
}

// Haversine en metros
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (d: number) => d * Math.PI / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Suscripción en tiempo real a denuncias públicas.
 * Se activa cuando hay INSERT/UPDATE/DELETE en la tabla denuncias.
 * El callback recibe el nuevo registro y debe filtrar por coords/radio en el cliente.
 */
export function subscribeToPublicReports(
  onNewReport: (report: any) => void,
  onUpdateReport: (report: any) => void,
  onDeleteReport: (reportId: string) => void,
): RealtimeChannel {
  const channel = supabase
    .channel('public-reports-feed')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'denuncias',
        // Filtrar solo públicas (es_publica = true)
        filter: 'es_publica=eq.true',
      },
      (payload) => {
        // payload.new contiene el registro insertado
        onNewReport(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'denuncias',
        filter: 'es_publica=eq.true',
      },
      (payload) => {
        onUpdateReport(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'denuncias',
      },
      (payload) => {
        // payload.old contiene el id del registro eliminado
        onDeleteReport(String(payload.old.id));
      }
    )
    .subscribe();

  return channel;
}

/**
 * Desuscribirse del canal de tiempo real
 */
export async function unsubscribeFromPublicReports(channel: RealtimeChannel) {
  await supabase.removeChannel(channel);
}

export default {};
