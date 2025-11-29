// app/features/profileInspector/api/turnInspector.api.ts
import { supabase } from '@/app/shared/lib/supabase';

export interface TurnoTipo {
  id: number;
  nombre: string;
  hora_inicio: string;   // 'HH:MM:SS'
  hora_termino: string;  // 'HH:MM:SS'
}

export interface TurnoIngresoResultOk {
  ok: true;
  turnoId: number;
  ingresoReal: string; // ISO string
}

export type TurnoErrorCode =
  | 'NO_AUTH'
  | 'INSPECTOR_NOT_FOUND'
  | 'TURNOTIPO_NOT_FOUND'
  | 'TURNO_NOT_FOUND'
  | 'FUERA_VENTANA'
  | 'RPC_ERROR';

export interface TurnoIngresoResultError {
  ok: false;
  type: TurnoErrorCode;
  message: string;
  detalle?: any;
}

export type TurnoIngresoResult = TurnoIngresoResultOk | TurnoIngresoResultError;

/**
 * Construye un Date con la hora de hoy + el time de la BD.
 */
function buildTodayDateWithTime(time: string): Date {
  const [hStr, mStr, sStr] = time.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const m = parseInt(mStr ?? '0', 10);
  const s = parseInt(sStr ?? '0', 10);
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    h,
    m,
    s || 0,
    0
  );
}

/**
 * Devuelve la hora mínima desde la que se permite iniciar el turno:
 * hora_inicio - 15 minutos.
 */
export function calcularInicioPermitido(horaInicio: string): Date {
  const inicio = buildTodayDateWithTime(horaInicio);
  const quinceMin = 15 * 60 * 1000;
  return new Date(inicio.getTime() - quinceMin);
}

/**
 * Pequeña ayuda para marcar si el error PROBABLEMENTE es por RLS / permisos.
 */
function marcarSiPosibleRls(error: any) {
  if (!error) return { posibleRls: false };
  const msg = `${error.message ?? ''}`.toLowerCase();
  const code = `${error.code ?? ''}`.toLowerCase();

  const posibleRls =
    msg.includes('row-level security') ||
    msg.includes('permission denied') ||
    code === '42501';

  return { posibleRls, code: error.code, message: error.message };
}

/**
 * Registra la ENTRADA del turno actual del inspector autenticado.
 * - Valida ventana de 15 minutos antes de la hora de inicio.
 * - Si no hay turno ACTIVO para hoy, crea uno nuevo.
 * - Llama al RPC fn_turno_registrar_evento con código 'ENTRADA'.
 */
export async function registrarIngresoTurnoActual(): Promise<TurnoIngresoResult> {
  // 1. Usuario autenticado
  const { data: authData, error: authError } = await supabase.auth.getUser();
  console.log('[turno][ingreso] authData:', authData, 'authError:', authError);

  if (authError || !authData?.user) {
    return {
      ok: false,
      type: 'NO_AUTH',
      message: 'No se pudo obtener el usuario autenticado.',
      detalle: authError,
    };
  }

  const user = authData.user;

  // 2. Buscar inspector + tipo de turno asociado
  const { data: inspector, error: inspectorError } = await supabase
    .from('inspectores')
    .select(
      'id, tipo_turno, turno_tipo:turno_tipo(id, nombre, hora_inicio, hora_termino)'
    )
    .eq('usuario_id', user.id)
    .single();

  console.log('[turno][ingreso] inspector:', inspector, 'inspectorError:', inspectorError);

  if (inspectorError || !inspector) {
    return {
      ok: false,
      type: 'INSPECTOR_NOT_FOUND',
      message: 'No se encontró un inspector asociado al usuario.',
      detalle: inspectorError,
    };
  }

  // Normalizar turno_tipo (puede venir como array)
  const turnoTipoRaw = (inspector as any).turno_tipo;
  const turnoTipo: TurnoTipo | null = Array.isArray(turnoTipoRaw)
    ? ((turnoTipoRaw[0] as TurnoTipo | undefined) ?? null)
    : (turnoTipoRaw as TurnoTipo | null);

  console.log('[turno][ingreso] turnoTipoRaw:', turnoTipoRaw, 'turnoTipo:', turnoTipo);

  if (!turnoTipo) {
    return {
      ok: false,
      type: 'TURNOTIPO_NOT_FOUND',
      message: 'El inspector no tiene un tipo de turno asignado.',
    };
  }

  // // 3. Regla de los 15 minutos - validación en el front
  // const ahora = new Date();
  // const inicioPermitido = calcularInicioPermitido(turnoTipo.hora_inicio);

  // console.log('[turno][ingreso] ahora:', ahora.toISOString(), 'inicioPermitido:', inicioPermitido.toISOString());

  // if (ahora < inicioPermitido) {
  //   return {
  //     ok: false,
  //     type: 'FUERA_VENTANA',
  //     message:
  //       'Todavía no puedes iniciar tu turno. Solo se puede ingresar 15 minutos antes de la hora de inicio.',
  //     detalle: {
  //       hora_inicio: turnoTipo.hora_inicio,
  //       inicio_permitido: inicioPermitido.toISOString(),
  //     },
  //   };
  // }

  // 4. Buscar o crear el turno ACTIVO del día actual
  const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  console.log('[turno][ingreso] hoy:', hoy);

  // Solo consideramos turnos activos: PENDIENTE / EN_CURSO / EN_PAUSA
  const { data: turnoActivo, error: turnoError } = await supabase
    .from('turnos')
    .select('id, estado, hora_inicio_real')
    .eq('inspector_id', inspector.id)
    .eq('fecha', hoy)
    .in('estado', ['PENDIENTE', 'EN_CURSO', 'EN_PAUSA'])
    .order('id', { ascending: false })
    .maybeSingle();

  console.log('[turno][ingreso] turnoActivo:', turnoActivo, 'turnoError:', turnoError);

  if (turnoError) {
    return {
      ok: false,
      type: 'RPC_ERROR',
      message: 'Error al buscar el turno del día.',
      detalle: {
        ...turnoError,
        ...marcarSiPosibleRls(turnoError),
      },
    };
  }

  let turnoId: number;

  // Si no hay turno ACTIVO para hoy, lo creamos
  if (!turnoActivo) {
    console.log('[turno][ingreso] No hay turno activo, intentando crear nuevo turno...');
    const { data: nuevoTurno, error: nuevoTurnoError } = await supabase
      .from('turnos')
      .insert({
        inspector_id: inspector.id,
        fecha: hoy,
        estado: 'PENDIENTE',
        creado_por: user.id,
      })
      .select('id, estado, hora_inicio_real')
      .single();

    console.log('[turno][ingreso] nuevoTurno:', nuevoTurno, 'nuevoTurnoError:', nuevoTurnoError);

    if (nuevoTurnoError || !nuevoTurno) {
      return {
        ok: false,
        type: 'TURNO_NOT_FOUND',
        message:
          'No existe un turno activo para hoy y no se pudo crear automáticamente.',
        detalle: {
          error: nuevoTurnoError,
          ...marcarSiPosibleRls(nuevoTurnoError),
        },
      };
    }

    turnoId = nuevoTurno.id;
  } else {
    turnoId = turnoActivo.id;
  }

  console.log('[turno][ingreso] turnoId que se usará en RPC:', turnoId);

  // 5. Llamar RPC que registra evento de ENTRADA
  const { error: rpcError } = await supabase.rpc(
    'fn_turno_registrar_evento',
    {
      p_turno_id: turnoId,
      p_evento_codigo: 'ENTRADA',
      p_observacion: null,
      p_actor_user_id: user.id,
      p_ts: new Date().toISOString(),
    }
  );

  console.log('[turno][ingreso] rpcError:', rpcError);

  if (rpcError) {
    return {
      ok: false,
      type: 'RPC_ERROR',
      message: 'Ocurrió un error al registrar la entrada del turno.',
      detalle: {
        error: rpcError,
        ...marcarSiPosibleRls(rpcError),
      },
    };
  }

  // 6. Volver a leer el turno para obtener hora_inicio_real actualizada
  const { data: turnoActualizado, error: turnoActualizadoError } =
    await supabase
      .from('turnos')
      .select('id, hora_inicio_real')
      .eq('id', turnoId)
      .single();

  console.log('[turno][ingreso] turnoActualizado:', turnoActualizado, 'turnoActualizadoError:', turnoActualizadoError);

  if (turnoActualizadoError) {
    return {
      ok: true,
      turnoId,
      ingresoReal: new Date().toISOString(), // fallback
    };
  }

  return {
    ok: true,
    turnoId,
    ingresoReal:
      turnoActualizado?.hora_inicio_real ?? new Date().toISOString(),
  };
}

export interface TurnoSalidaResultOk {
  ok: true;
  turnoId: number;
  salidaReal: string; // ISO string
}

export interface TurnoSalidaResultError {
  ok: false;
  type: TurnoErrorCode;
  message: string;
  detalle?: any;
}

export type TurnoSalidaResult = TurnoSalidaResultOk | TurnoSalidaResultError;

/**
 * Registra la SALIDA del turno actual del inspector autenticado.
 * - Busca el turno EN_CURSO de hoy (si hay varios, toma el último).
 * - Llama al RPC fn_turno_registrar_evento con código 'SALIDA'.
 */
export async function registrarSalidaTurnoActual(): Promise<TurnoSalidaResult> {
  // 1. Usuario autenticado
  const { data: authData, error: authError } = await supabase.auth.getUser();
  console.log('[turno][salida] authData:', authData, 'authError:', authError);

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

  console.log('[turno][salida] inspector:', inspector, 'inspectorError:', inspectorError);

  if (inspectorError || !inspector) {
    return {
      ok: false,
      type: 'INSPECTOR_NOT_FOUND',
      message: 'No se encontró un inspector asociado al usuario.',
      detalle: inspectorError,
    };
  }

  // 3. Buscar turno EN_CURSO del día
  const hoy = new Date().toISOString().split('T')[0];
  console.log('[turno][salida] hoy:', hoy);

  const { data: turnoData, error: turnoError } = await supabase
    .from('turnos')
    .select('id, estado, hora_fin_real')
    .eq('inspector_id', inspector.id)
    .eq('fecha', hoy)
    .eq('estado', 'EN_CURSO')
    .order('id', { ascending: false })
    .maybeSingle();

  console.log('[turno][salida] turnoData:', turnoData, 'turnoError:', turnoError);

  if (turnoError) {
    return {
      ok: false,
      type: 'RPC_ERROR',
      message: 'Error al buscar el turno del día.',
      detalle: {
        ...turnoError,
        ...marcarSiPosibleRls(turnoError),
      },
    };
  }

  if (!turnoData) {
    return {
      ok: false,
      type: 'TURNO_NOT_FOUND',
      message: 'No tienes un turno en curso para hoy.',
    };
  }

  const turnoId = turnoData.id;
  console.log('[turno][salida] turnoId que se usará en RPC:', turnoId);

  // 4. Llamar RPC que registra evento de SALIDA
  const { error: rpcError } = await supabase.rpc(
    'fn_turno_registrar_evento',
    {
      p_turno_id: turnoId,
      p_evento_codigo: 'SALIDA',
      p_observacion: null,
      p_actor_user_id: user.id,
      p_ts: new Date().toISOString(),
    }
  );

  console.log('[turno][salida] rpcError:', rpcError);

  if (rpcError) {
    return {
      ok: false,
      type: 'RPC_ERROR',
      message: 'Ocurrió un error al registrar la salida del turno.',
      detalle: {
        error: rpcError,
        ...marcarSiPosibleRls(rpcError),
      },
    };
  }

  // 5. Volver a leer el turno para obtener hora_fin_real
  const { data: turnoActualizado, error: turnoActualizadoError } =
    await supabase
      .from('turnos')
      .select('id, hora_fin_real')
      .eq('id', turnoId)
      .single();

  console.log('[turno][salida] turnoActualizado:', turnoActualizado, 'turnoActualizadoError:', turnoActualizadoError);

  if (turnoActualizadoError) {
    return {
      ok: true,
      turnoId,
      salidaReal: new Date().toISOString(), // fallback
    };
  }

  return {
    ok: true,
    turnoId,
    salidaReal:
      turnoActualizado?.hora_fin_real ?? new Date().toISOString(),
  };
}

/**
 * Obtiene el estado actual del turno del inspector autenticado
 * Retorna true si tiene un turno activo (EN_CURSO), false si no.
 */
export async function verificarTurnoActivo(): Promise<boolean> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    console.log('[turno][activo] authData:', authData, 'authError:', authError);

    if (authError || !authData?.user) {
      return false;
    }

    // Buscar inspector primero
    const { data: inspector, error: inspectorError } = await supabase
      .from('inspectores')
      .select('id')
      .eq('usuario_id', authData.user.id)
      .single();

    console.log('[turno][activo] inspector:', inspector, 'inspectorError:', inspectorError);

    if (inspectorError || !inspector) {
      return false;
    }

    // Buscar turno activo del día
    const hoy = new Date().toISOString().split('T')[0];
    console.log('[turno][activo] hoy:', hoy);

    const { data, error } = await supabase
      .from('turnos')
      .select('id, estado, hora_inicio_real, hora_fin_real')
      .eq('inspector_id', inspector.id)
      .eq('fecha', hoy)
      .eq('estado', 'EN_CURSO')
      .maybeSingle();

    console.log('[turno][activo] data:', data, 'error:', error);

    if (error || !data) {
      return false;
    }

    return (
      data.estado === 'EN_CURSO' &&
      !!data.hora_inicio_real &&
      !data.hora_fin_real
    );
  } catch (e) {
    console.log('[turno][activo] unexpected error:', e);
    return false;
  }
}

export default {};