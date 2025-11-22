import { supabase } from '@/app/shared/lib/supabase';

export interface InspectorPersonInfo {
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  avatar_url?: string | null;
}

export interface InspectorTurnType {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  hora_inicio: string;
  hora_termino: string;
  operador: boolean;
  inspector: boolean;
}

export interface InspectorProfile {
  id: number;
  usuario_id: string;
  activo: boolean;
  tipo_turno: number | null;
  perfil: InspectorPersonInfo | null;
  turno_tipo: InspectorTurnType | null;
}

function normalizeRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) return null;
  if (Array.isArray(relation)) {
    return relation.length > 0 ? (relation[0] as T) : null;
  }
  return relation as T;
}

/**
 * Obtiene el perfil completo del inspector autenticado
 * Incluye información personal y datos del turno asignado
 * 
 * @returns Objeto con data (perfil del inspector) y error
 */
export async function getInspectorProfile(): Promise<{
  data: InspectorProfile | null;
  error: string | null;
}> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return {
        data: null,
        error: 'Usuario no autenticado',
      };
    }

    const { data, error } = await supabase
      .from('inspectores')
      .select(`
        id,
        usuario_id,
        activo,
        tipo_turno,
        perfil:perfiles_ciudadanos!inspectores_usuario_id_fkey(
          nombre,
          apellido,
          email,
          telefono,
          avatar_url
        ),
        turno_tipo:turno_tipo(
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
      .eq('usuario_id', userData.user.id)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener perfil del inspector:', error);
      return {
        data: null,
        error: error.message || 'Error al obtener el perfil del inspector',
      };
    }

    if (!data) {
      return {
        data: null,
        error: null,
      };
    }

    return {
      data: {
        id: data.id,
        usuario_id: data.usuario_id,
        activo: data.activo,
        tipo_turno: data.tipo_turno ?? null,
        perfil: normalizeRelation<InspectorPersonInfo>(data.perfil),
        turno_tipo: normalizeRelation<InspectorTurnType>(data.turno_tipo as any),
      },
      error: null,
    };
  } catch (error: any) {
    console.error('Error inesperado al obtener perfil del inspector:', error);
    return {
      data: null,
      error: error?.message || 'Error inesperado',
    };
  }
}

/**
 * Obtiene solo los datos del turno asignado al inspector autenticado
 * Esta es una función de conveniencia que extrae el turno de getInspectorProfile()
 * 
 * @returns Datos del turno o null si no tiene turno asignado
 * @throws Error si hay un problema al obtener los datos
 */
export async function getTurnoInspector(): Promise<InspectorTurnType | null> {
  const { data, error } = await getInspectorProfile();
  
  if (error) {
    throw new Error(error);
  }
  
  return data?.turno_tipo ?? null;
}

/**
 * Interfaz de respuesta compatible con el formato anterior
 * @deprecated Usar getInspectorProfile() directamente para obtener más información
 */
export interface InspectorTurnoResponse {
  inspector_id: number;
  tipo_turno_id: number | null;
  turno_data: InspectorTurnType | null;
}

/**
 * Obtiene los datos del turno en formato compatible con la versión anterior
 * @deprecated Usar getInspectorProfile() o getTurnoInspector() en su lugar
 * 
 * @returns Objeto con información del inspector y su turno asignado
 * @throws Error si no hay usuario autenticado o si ocurre un error
 */
export async function getTurnoInspectorCompat(): Promise<InspectorTurnoResponse> {
  const { data, error } = await getInspectorProfile();
  
  if (error) {
    throw new Error(error);
  }
  
  if (!data) {
    throw new Error('Inspector no encontrado');
  }
  
  return {
    inspector_id: data.id,
    tipo_turno_id: data.tipo_turno,
    turno_data: data.turno_tipo,
  };
}
