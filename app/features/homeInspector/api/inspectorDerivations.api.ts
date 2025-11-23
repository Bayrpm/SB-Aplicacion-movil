// app/features/inspectorDerivations/api/inspectorDerivations.api.ts
import { supabase } from '@/app/shared/lib/supabase';

export type DerivacionEstadoNombre =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'CERRADA'
  | 'DESCONOCIDO';

export interface DerivacionItem {
  asignacionId: number;
  denunciaId: string;

  folio: string | null;
  titulo: string | null;
  descripcion: string | null;
  ubicacionTexto: string | null;

  // Estado de la DENUNCIA (tabla denuncias)
  estadoId: number | null;
  estadoNombre: DerivacionEstadoNombre;

  // Fechas de la asignación
  fechaDerivacion: string;
  fechaInicioAtencion: string | null;
  fechaTermino: string | null;

  // Fechas de la denuncia
  fechaCreacionDenuncia: string | null;
  fechaCierreDenuncia: string | null;
}

export type DerivacionesErrorType =
  | 'NO_AUTH'
  | 'INSPECTOR_NOT_FOUND'
  | 'DB_ERROR';

export type DerivacionesResult =
  | { ok: true; items: DerivacionItem[] }
  | { ok: false; type: DerivacionesErrorType; message: string; detalle?: any };

/**
 * Mapea el estado de la derivación considerando tanto el estado de la denuncia
 * como el estado de la asignación individual del inspector.
 * 
 * Si la asignación tiene fecha_termino → la derivación está CERRADA para este inspector,
 * aunque la denuncia global siga en proceso (otros inspectores aún trabajando).
 */
function mapEstadoNombre(
  estadoId: number | null,
  fechaTermino: string | null
): DerivacionEstadoNombre {
  // Si esta asignación ya fue cerrada por el inspector, mostrar CERRADA
  if (fechaTermino) return 'CERRADA';
  
  // Si no, usar el estado global de la denuncia
  if (estadoId === 1) return 'PENDIENTE';
  if (estadoId === 2) return 'EN_PROCESO';
  if (estadoId === 3) return 'CERRADA';
  return 'DESCONOCIDO';
}



/**
 * Obtiene TODAS las derivaciones del inspector autenticado
 * (activas + históricas), ordenadas por fecha_derivacion DESC.
 */
export async function fetchInspectorDerivaciones(): Promise<DerivacionesResult> {
  console.log('[API] fetchInspectorDerivaciones - Iniciando...');

  // 1. Usuario autenticado
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    console.log('[API] Error de autenticación:', authError);
    return {
      ok: false,
      type: 'NO_AUTH',
      message: 'No se pudo obtener el usuario autenticado.',
      detalle: authError,
    };
  }

  const user = authData.user;
  console.log('[API] Usuario autenticado:', user.id);

  // 2. Buscar inspector asociado al usuario
  const { data: inspector, error: inspectorError } = await supabase
    .from('inspectores')
    .select('id')
    .eq('usuario_id', user.id)
    .single();

  if (inspectorError || !inspector) {
    console.log('[API] Error al buscar inspector:', inspectorError);
    return {
      ok: false,
      type: 'INSPECTOR_NOT_FOUND',
      message: 'No se encontró un inspector asociado al usuario.',
      detalle: inspectorError,
    };
  }

  console.log('[API] Inspector encontrado:', inspector.id);

  // 3. Buscar derivaciones (asignaciones_inspector + denuncia)
  console.log('[API] Buscando derivaciones para inspector_id:', inspector.id);
  
  const { data, error } = await supabase
    .from('asignaciones_inspector')
    .select(
      `
      id,
      denuncia_id,
      fecha_derivacion,
      fecha_inicio_atencion,
      fecha_termino,
      denuncia:denuncias(
        id,
        folio,
        titulo,
        descripcion,
        ubicacion_texto,
        estado_id,
        fecha_creacion,
        fecha_cierre
      )
    `
    )
    .eq('inspector_id', inspector.id)
    .order('fecha_derivacion', { ascending: false });

  console.log('[API] Query completada. Data:', data, 'Error:', error);

  if (error) {
    console.log('[API] Error en query de derivaciones:', error);
    return {
      ok: false,
      type: 'DB_ERROR',
      message: 'Error al obtener las derivaciones del inspector.',
      detalle: error,
    };
  }

  console.log(
    '[API] Datos obtenidos de Supabase:',
    data?.length ?? 0,
    'registros'
  );

  // Debug adicional: verificar si hay asignaciones sin el join
  if (data?.length === 0) {
    console.log('[API] No hay derivaciones. Verificando si existen asignaciones simples...');
    const { data: asignacionesSimples } = await supabase
      .from('asignaciones_inspector')
      .select('id, inspector_id, denuncia_id, fecha_derivacion')
      .eq('inspector_id', inspector.id);
    
    console.log('[API] Asignaciones simples encontradas:', asignacionesSimples?.length ?? 0);
    if (asignacionesSimples && asignacionesSimples.length > 0) {
      console.log('[API] Primera asignación:', asignacionesSimples[0]);
      
      // Verificar si la denuncia existe
      const denunciaId = asignacionesSimples[0].denuncia_id;
      const { data: denunciaExiste } = await supabase
        .from('denuncias')
        .select('id, folio, titulo')
        .eq('id', denunciaId)
        .single();
      
      console.log('[API] ¿Existe la denuncia?', denunciaExiste ? 'SÍ' : 'NO', denunciaExiste);
    }
  }

  const items: DerivacionItem[] =
    (data ?? []).map((row: any) => {
      const denuncia = row.denuncia || {};
      const estadoId: number | null = denuncia.estado_id ?? null;

      const fechaInicioAtencion: string | null =
        row.fecha_inicio_atencion ?? null;
      const fechaTermino: string | null = row.fecha_termino ?? null;

      return {
        asignacionId: row.id,
        denunciaId: row.denuncia_id,

        folio: denuncia.folio ?? null,
        titulo: denuncia.titulo ?? null,
        descripcion: denuncia.descripcion ?? null,
        ubicacionTexto: denuncia.ubicacion_texto ?? null,

        estadoId,
        estadoNombre: mapEstadoNombre(estadoId, fechaTermino),

        fechaDerivacion: row.fecha_derivacion,
        fechaInicioAtencion,
        fechaTermino,

        fechaCreacionDenuncia: denuncia.fecha_creacion ?? null,
        fechaCierreDenuncia: denuncia.fecha_cierre ?? null,
      };
    }) ?? [];

  console.log('[API] Derivaciones mapeadas:', items.length);
  console.log(
    '[API] Primera derivación (si existe):',
    items[0]
      ? {
          folio: items[0].folio,
          titulo: items[0].titulo,
          estadoId: items[0].estadoId,
          estadoNombre: items[0].estadoNombre,
        }
      : 'Sin derivaciones'
  );

  return {
    ok: true,
    items,
  };
}

// Tipos de resultado para cierre de derivación
export type CerrarDerivacionErrorType =
  | 'NO_AUTH'
  | 'INSPECTOR_NOT_FOUND'
  | 'NOT_OWNER'
  | 'ALREADY_CLOSED'
  | 'DB_ERROR';

export type CerrarDerivacionResult =
  | { ok: true }
  | {
      ok: false;
      type: CerrarDerivacionErrorType;
      message: string;
      detalle?: any;
    };

interface CerrarDerivacionParams {
  asignacionId: number;
  denunciaId: string; // uuid en formato string
  reporte: string;
}

/**
 * Cierra una derivación para el inspector autenticado:
 *  - Inserta observación en denuncia_observaciones (tipo 'TERRENO')
 *  - Marca fecha_termino en asignaciones_inspector
 *  - Pone denuncias.estado_id = 3 (CERRADA) y fecha_cierre = now()
 */
export async function cerrarDerivacionConReporte(
  params: CerrarDerivacionParams
): Promise<CerrarDerivacionResult> {
  const { asignacionId, denunciaId, reporte } = params;

  // 1. Usuario autenticado
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    return {
      ok: false,
      type: 'NO_AUTH',
      message: 'No se pudo obtener el usuario autenticado.',
      detalle: authError,
    };
  }

  const user = authData.user;

  // 2. Buscar inspector asociado al usuario
  const { data: inspector, error: inspectorError } = await supabase
    .from('inspectores')
    .select('id')
    .eq('usuario_id', user.id)
    .single();

  if (inspectorError || !inspector) {
    return {
      ok: false,
      type: 'INSPECTOR_NOT_FOUND',
      message: 'No se encontró un inspector asociado al usuario.',
      detalle: inspectorError,
    };
  }

  // 3. Verificar que la asignación pertenece a este inspector
  const { data: asignacion, error: asignacionError } = await supabase
    .from('asignaciones_inspector')
    .select('id, denuncia_id, inspector_id, fecha_termino')
    .eq('id', asignacionId)
    .eq('denuncia_id', denunciaId)
    .single();

  if (asignacionError || !asignacion) {
    return {
      ok: false,
      type: 'NOT_OWNER',
      message:
        'No se encontró la asignación indicada para este inspector y denuncia.',
      detalle: asignacionError,
    };
  }

  if (asignacion.inspector_id !== inspector.id) {
    return {
      ok: false,
      type: 'NOT_OWNER',
      message: 'La asignación no pertenece al inspector autenticado.',
    };
  }

  const nowIso = new Date().toISOString();
  const yaCerrada = !!asignacion.fecha_termino;

  console.log('[cerrarDerivacion] Asignación', asignacionId, 'ya cerrada:', yaCerrada);

  // 4. Insertar observación de cierre (solo si no estaba cerrada)
  if (!yaCerrada) {
    const { error: obsError } = await supabase
      .from('denuncia_observaciones')
      .insert({
        denuncia_id: denunciaId,
        tipo: 'TERRENO',
        contenido: reporte,
        creado_por: user.id,
      });

    if (obsError) {
      return {
        ok: false,
        type: 'DB_ERROR',
        message:
          'Ocurrió un error al guardar el reporte de cierre de la denuncia.',
        detalle: obsError,
      };
    }
    console.log('[cerrarDerivacion] Observación TERRENO insertada');
  } else {
    console.log('[cerrarDerivacion] Asignación ya cerrada, no se inserta observación');
  }

  // 5. Marcar fecha_termino en asignaciones_inspector (solo si no estaba cerrada)
  if (!yaCerrada) {
    const { error: asignUpdateError } = await supabase
      .from('asignaciones_inspector')
      .update({
        fecha_termino: nowIso,
      })
      .eq('id', asignacionId)
      .eq('inspector_id', inspector.id);

    if (asignUpdateError) {
      return {
        ok: false,
        type: 'DB_ERROR',
        message: 'Ocurrió un error al marcar la derivación como finalizada.',
        detalle: asignUpdateError,
      };
    }
    console.log('[cerrarDerivacion] fecha_termino actualizada en asignación');
  } else {
    console.log('[cerrarDerivacion] Asignación ya tenía fecha_termino');
  }

  // 6. Verificar si TODAS las asignaciones de esta denuncia están cerradas
  const { data: todasAsignaciones, error: asignacionesError } = await supabase
    .from('asignaciones_inspector')
    .select('id, fecha_termino')
    .eq('denuncia_id', denunciaId);

  if (asignacionesError) {
    console.error(
      '[cerrarDerivacion] Error al verificar asignaciones:',
      asignacionesError
    );
    // No falla la operación, solo loguea
  }

  const todasCerradas = todasAsignaciones?.every((a) => a.fecha_termino !== null) ?? false;
  console.log(
    '[cerrarDerivacion] Asignaciones totales:',
    todasAsignaciones?.length,
    'Todas cerradas:',
    todasCerradas
  );

  // 7. Si todas las asignaciones están cerradas, actualizar la denuncia
  if (todasCerradas) {
    // Primero verificar si la denuncia ya está cerrada
    const { data: denunciaActual } = await supabase
      .from('denuncias')
      .select('estado_id, fecha_cierre')
      .eq('id', denunciaId)
      .single();

    const denunciaYaCerrada =
      denunciaActual?.estado_id === 3 || denunciaActual?.fecha_cierre !== null;

    console.log('[cerrarDerivacion] Denuncia ya cerrada:', denunciaYaCerrada);

    if (!denunciaYaCerrada) {
      const { error: denUpdateError } = await supabase
        .from('denuncias')
        .update({
          estado_id: 3,
          fecha_cierre: nowIso,
        })
        .eq('id', denunciaId);

      if (denUpdateError) {
        console.error(
          '[cerrarDerivacion] Error al actualizar denuncia a cerrada:',
          denUpdateError
        );
        // No retorna error, la asignación ya se cerró correctamente
      } else {
        console.log('[cerrarDerivacion] Denuncia actualizada a CERRADA');
      }
    } else {
      console.log('[cerrarDerivacion] Denuncia ya estaba cerrada, no se actualiza');
    }
  } else {
    console.log(
      '[cerrarDerivacion] No todas las asignaciones cerradas, denuncia sigue EN_PROCESO'
    );
  }

  return {
    ok: true,
  };
}

interface MarcarEnProcesoParams {
  asignacionId: number;
  denunciaId: string; // uuid
}

export type MarcarEnProcesoErrorType =
  | 'NO_AUTH'
  | 'INSPECTOR_NOT_FOUND'
  | 'NOT_OWNER'
  | 'ALREADY_IN_PROCESS_OR_CLOSED'
  | 'DB_ERROR';

export type MarcarEnProcesoResult =
  | { ok: true }
  | {
      ok: false;
      type: MarcarEnProcesoErrorType;
      message: string;
      detalle?: any;
    };

/**
 * Marca una derivación como EN_PROCESO para el inspector autenticado.
 * - Setea fecha_inicio_atencion en asignaciones_inspector (si está null)
 * - Opcionalmente actualiza la denuncia (estado_id y fecha_inicio_atencion)
 *   pero el estado mostrado en la app se basa en las fechas de la asignación.
 */
export async function marcarDerivacionEnProceso(
  params: MarcarEnProcesoParams
): Promise<MarcarEnProcesoResult> {
  const { asignacionId, denunciaId } = params;

  // 1. Usuario autenticado
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    return {
      ok: false,
      type: 'NO_AUTH',
      message: 'No se pudo obtener el usuario autenticado.',
      detalle: authError,
    };
  }

  const user = authData.user;

  // 2. Buscar inspector
  const { data: inspector, error: inspectorError } = await supabase
    .from('inspectores')
    .select('id')
    .eq('usuario_id', user.id)
    .single();

  if (inspectorError || !inspector) {
    return {
      ok: false,
      type: 'INSPECTOR_NOT_FOUND',
      message: 'No se encontró un inspector asociado al usuario.',
      detalle: inspectorError,
    };
  }

  // 3. Verificar asignación
  const { data: asignacion, error: asignacionError } = await supabase
    .from('asignaciones_inspector')
    .select('id, denuncia_id, inspector_id, fecha_inicio_atencion, fecha_termino')
    .eq('id', asignacionId)
    .eq('denuncia_id', denunciaId)
    .single();

  if (asignacionError || !asignacion) {
    return {
      ok: false,
      type: 'NOT_OWNER',
      message:
        'No se encontró la asignación indicada para este inspector y denuncia.',
      detalle: asignacionError,
    };
  }

  if (asignacion.inspector_id !== inspector.id) {
    return {
      ok: false,
      type: 'NOT_OWNER',
      message: 'La asignación no pertenece al inspector autenticado.',
    };
  }

  if (asignacion.fecha_termino) {
    return {
      ok: false,
      type: 'ALREADY_IN_PROCESS_OR_CLOSED',
      message: 'La derivación ya fue finalizada previamente.',
    };
  }

  const nowIso = new Date().toISOString();

  // 4. Actualizar asignación: fecha_inicio_atencion (solo si está null)
  if (!asignacion.fecha_inicio_atencion) {
    const { error: asignUpdateError } = await supabase
      .from('asignaciones_inspector')
      .update({
        fecha_inicio_atencion: nowIso,
      })
      .eq('id', asignacionId)
      .eq('inspector_id', inspector.id);

    if (asignUpdateError) {
      return {
        ok: false,
        type: 'DB_ERROR',
        message:
          'Ocurrió un error al marcar el inicio de atención de la derivación.',
        detalle: asignUpdateError,
      };
    }
  }

  // 5. (Opcional) Actualizar denuncia: de estado 1 (Pendiente) a 2 (En proceso)
  //    y fecha_inicio_atencion si está null.
  //    Nota: ya existe un trigger que pone la denuncia en "En proceso" al asignarla;
  //    esto es por si en algún caso siguiera en 1.
  const { data: denuncia, error: denSelectError } = await supabase
    .from('denuncias')
    .select('estado_id, fecha_inicio_atencion')
    .eq('id', denunciaId)
    .single();

  if (denSelectError || !denuncia) {
    return {
      ok: false,
      type: 'DB_ERROR',
      message: 'No se pudo obtener la denuncia asociada.',
      detalle: denSelectError,
    };
  }

  const updates: Record<string, any> = {};
  if (denuncia.estado_id === 1) {
    updates.estado_id = 2;
  }
  if (!denuncia.fecha_inicio_atencion) {
    updates.fecha_inicio_atencion = nowIso;
  }

  if (Object.keys(updates).length > 0) {
    const { error: denUpdateError } = await supabase
      .from('denuncias')
      .update(updates)
      .eq('id', denunciaId);

    if (denUpdateError) {
      return {
        ok: false,
        type: 'DB_ERROR',
        message:
          'Ocurrió un error al actualizar el estado de la denuncia a En proceso.',
        detalle: denUpdateError,
      };
    }
  }

  return { ok: true };
}
