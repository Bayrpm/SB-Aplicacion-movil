import { supabase } from '@/app/shared/lib/supabase';

/**
 * Interfaz que representa los datos del tipo de turno asignado al inspector
 */
export interface TurnoInspectorData {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  hora_inicio: string;
  hora_termino: string;
  operador: boolean;
  inspector: boolean;
}

/**
 * Interfaz de respuesta para el turno del inspector
 */
export interface InspectorTurnoResponse {
  inspector_id: number;
  tipo_turno_id: number | null;
  turno_data: TurnoInspectorData | null;
}

/**
 * Obtiene los datos del turno asignado al inspector autenticado
 * 
 * @returns Objeto con información del inspector y su turno asignado
 * @throws Error si no hay usuario autenticado o si ocurre un error en la consulta
 */
export async function getTurnoInspector(): Promise<InspectorTurnoResponse> {
  try {
    // Obtener el usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('No hay usuario autenticado');
    }

    // Consultar los datos del inspector y su turno asignado
    const { data, error } = await supabase
      .from('inspectores')
      .select(`
        id,
        tipo_turno,
        turno_tipo:tipo_turno (
          id,
          nombre,
          descripcion,
          activo,
          hora_inicio,
          hora_termino,
          operador,
          inspector
        )
      `)
      .eq('usuario_id', user.id)
      .eq('activo', true)
      .single();

    if (error) {
      throw new Error(`Error al obtener turno del inspector: ${error.message}`);
    }

    if (!data) {
      throw new Error('Inspector no encontrado');
    }

    // Extraer el turno_tipo como objeto único
    const turnoData = Array.isArray(data.turno_tipo) 
      ? (data.turno_tipo[0] as TurnoInspectorData | undefined) ?? null
      : (data.turno_tipo as TurnoInspectorData | null);

    return {
      inspector_id: data.id,
      tipo_turno_id: data.tipo_turno,
      turno_data: turnoData,
    };
  } catch (error) {
    console.error('Error en getTurnoInspector:', error);
    throw error;
  }
}

/**
 * Obtiene los datos del turno asignado a un inspector específico por su ID
 * 
 * @param inspectorId - ID del inspector
 * @returns Objeto con información del inspector y su turno asignado
 * @throws Error si ocurre un error en la consulta
 */
export async function getTurnoInspectorById(inspectorId: number): Promise<InspectorTurnoResponse> {
  try {
    const { data, error } = await supabase
      .from('inspectores')
      .select(`
        id,
        tipo_turno,
        turno_tipo:tipo_turno (
          id,
          nombre,
          descripcion,
          activo,
          hora_inicio,
          hora_termino,
          operador,
          inspector
        )
      `)
      .eq('id', inspectorId)
      .eq('activo', true)
      .single();

    if (error) {
      throw new Error(`Error al obtener turno del inspector: ${error.message}`);
    }

    if (!data) {
      throw new Error('Inspector no encontrado');
    }

    // Extraer el turno_tipo como objeto único
    const turnoData = Array.isArray(data.turno_tipo) 
      ? (data.turno_tipo[0] as TurnoInspectorData | undefined) ?? null
      : (data.turno_tipo as TurnoInspectorData | null);

    return {
      inspector_id: data.id,
      tipo_turno_id: data.tipo_turno,
      turno_data: turnoData,
    };
  } catch (error) {
    console.error('Error en getTurnoInspectorById:', error);
    throw error;
  }
}

export default {
  getTurnoInspector,getTurnoInspectorById,
};