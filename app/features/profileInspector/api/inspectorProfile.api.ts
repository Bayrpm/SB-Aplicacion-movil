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
  hora_inicio: string;
  hora_termino: string;
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
          hora_inicio,
          hora_termino
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
        turno_tipo: normalizeRelation<InspectorTurnType>(data.turno_tipo),
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

