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

export type TurnoIngresoResultErrorType =
  | 'NO_AUTH'
  | 'INSPECTOR_NOT_FOUND'
  | 'TURNOTIPO_NOT_FOUND'
  | 'FUERA_VENTANA'
  | 'RPC_ERROR';

export interface TurnoIngresoResultError {
  ok: false;
  type: TurnoIngresoResultErrorType;
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
 * Registra la ENTRADA del turno actual del inspector autenticado.
 * Aplica la regla: solo se puede iniciar desde 15 minutos antes de la hora de inicio del turno.
 */
export async function registrarIngresoTurnoActual(): Promise<TurnoIngresoResult> {
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

  // 2. Buscar inspector + tipo de turno asociado
  const { data: inspector, error: inspectorError } = await supabase
    .from('inspectores')
    .select(
      'id, tipo_turno, turno_tipo:turno_tipo(id, nombre, hora_inicio, hora_termino)'
    )
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

  // Normalizar turno_tipo (puede venir como array)
  const turnoTipoRaw = inspector.turno_tipo;
  const turnoTipo: TurnoTipo | null = Array.isArray(turnoTipoRaw)
    ? (turnoTipoRaw[0] as TurnoTipo | undefined) ?? null
    : (turnoTipoRaw as TurnoTipo | null);

  if (!turnoTipo) {
    return {
      ok: false,
      type: 'TURNOTIPO_NOT_FOUND',
      message: 'El inspector no tiene un tipo de turno asignado.',
    };
  }

  // 3. Regla de los 15 minutos - validación en el front (DESACTIVADA PARA PRUEBAS)
  // const ahora = new Date();
  // const inicioPermitido = calcularInicioPermitido(turnoTipo.hora_inicio);

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

  // 4. Buscar el turno del día actual (debe existir vía turnos_planificados)
  const hoy = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
  
  const { data: turnoData, error: turnoError } = await supabase
    .from('turnos')
    .select('id, estado')
    .eq('inspector_id', inspector.id)
    .eq('fecha', hoy)
    .maybeSingle();

  if (turnoError) {
    return {
      ok: false,
      type: 'RPC_ERROR',
      message: 'Error al buscar el turno del día.',
      detalle: turnoError,
    };
  }

  if (!turnoData) {
    return {
      ok: false,
      type: 'TURNOTIPO_NOT_FOUND',
      message: 'No tienes un turno planificado para hoy.',
    };
  }

  // 5. Llamar RPC que registra evento de ENTRADA
  // La función RPC ya existe en Supabase y maneja toda la lógica de estado y validaciones
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'fn_turno_registrar_evento',
    {
      turno_id: turnoData.id,
      codigo: 'ENTRADA',
    }
  );

  if (rpcError) {
    return {
      ok: false,
      type: 'RPC_ERROR',
      message: 'Ocurrió un error al registrar la entrada del turno.',
      detalle: rpcError,
    };
  }

  // La función RPC devuelve el turno actualizado
  const turnoActualizado = rpcData as { id: number; hora_inicio_real: string; estado: string } | null;

  return {
    ok: true,
    turnoId: turnoActualizado?.id ?? turnoData.id,
    ingresoReal: turnoActualizado?.hora_inicio_real ?? new Date().toISOString(),
  };
}

export interface TurnoSalidaResultOk {
  ok: true;
  turnoId: number;
  salidaReal: string; // ISO string
}

export interface TurnoSalidaResultError {
  ok: false;
  type: TurnoIngresoResultErrorType;
  message: string;
  detalle?: any;
}

export type TurnoSalidaResult = TurnoSalidaResultOk | TurnoSalidaResultError;

/**
 * Registra la SALIDA del turno actual del inspector autenticado.
 */
export async function registrarSalidaTurnoActual(): Promise<TurnoSalidaResult> {
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

  // 3. Buscar turno del día (el RPC validará el estado)
  const hoy = new Date().toISOString().split('T')[0];
  
  const { data: turnoData, error: turnoError } = await supabase
    .from('turnos')
    .select('id, estado')
    .eq('inspector_id', inspector.id)
    .eq('fecha', hoy)
    .maybeSingle();

  if (turnoError) {
    return {
      ok: false,
      type: 'RPC_ERROR',
      message: 'Error al buscar el turno del día.',
      detalle: turnoError,
    };
  }

  if (!turnoData) {
    return {
      ok: false,
      type: 'TURNOTIPO_NOT_FOUND',
      message: 'No tienes un turno para hoy.',
    };
  }

  // 4. Llamar RPC que registra evento de SALIDA
  // La función RPC ya existe en Supabase y maneja toda la validación de estado
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'fn_turno_registrar_evento',
    {
      turno_id: turnoData.id,
      codigo: 'SALIDA',
    }
  );

  if (rpcError) {
    return {
      ok: false,
      type: 'RPC_ERROR',
      message: 'Ocurrió un error al registrar la salida del turno.',
      detalle: rpcError,
    };
  }

  // La función RPC devuelve el turno actualizado
  const turnoActualizado = rpcData as { id: number; hora_fin_real: string; estado: string } | null;

  return {
    ok: true,
    turnoId: turnoActualizado?.id ?? turnoData.id,
    salidaReal: turnoActualizado?.hora_fin_real ?? new Date().toISOString(),
  };
}

/**
 * Obtiene el estado actual del turno del inspector autenticado
 * Retorna true si tiene un turno activo (EN_CURSO), false si no
 */
export async function verificarTurnoActivo(): Promise<boolean> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      return false;
    }

    // Buscar inspector primero
    const { data: inspector, error: inspectorError } = await supabase
      .from('inspectores')
      .select('id')
      .eq('usuario_id', authData.user.id)
      .single();

    if (inspectorError || !inspector) {
      return false;
    }

    // Buscar turno activo del día
    const hoy = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('turnos')
      .select('id, estado, hora_inicio_real, hora_fin_real')
      .eq('inspector_id', inspector.id)
      .eq('fecha', hoy)
      .eq('estado', 'EN_CURSO')
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return data.estado === 'EN_CURSO' && !!data.hora_inicio_real && !data.hora_fin_real;
  } catch {
    return false;
  }
}
