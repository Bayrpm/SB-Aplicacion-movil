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
    // 1) Trae sólo lo público/24h desde el server (tu RPC ya lo hace)
    const { data: rpc, error } = await supabase.rpc('get_denuncias_publicas_recientes');
    if (error) {
      return { data: [], hasMore: false, error: error.message };
    }

    // 2) Filtro adicional por edad si pides algo distinto a 24h
    const cutoff = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));

    // 3) Filtrar por radio en el cliente y mapear shape estable
    const rows = (rpc ?? [])
      .filter((r: any) => {
        if (maxAgeHours !== 24) {
          const ts = new Date(r.fecha_creacion);
          if (ts < cutoff) return false;
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
