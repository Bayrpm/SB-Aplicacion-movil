// app/features/profileInspector/api/dataMovil.api.ts
import { supabase } from '@/app/shared/lib/supabase';

export interface MovilTipo {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface Movil {
  id: number;
  patente: string;
  tipo_id: number;
  marca?: string;
  modelo?: string;
  anio?: number;
  kilometraje_actual: number;
  estado: string;
  movil_tipo?: MovilTipo | MovilTipo[];
}

export interface MovilUso {
  id: number;
  movil_id: number;
  inspector_id: number;
  turno_id?: number;
  inicio_ts: string;
  fin_ts?: string;
  km_recorridos?: number;
}

export interface MovilUsoKilometraje {
  id: number;
  uso_id: number;
  tipo_lectura: 'INICIO' | 'FIN' | 'INTERMEDIA';
  kilometraje: number;
  lectura_ts: string;
}

// ============== TIPOS DE RESULTADO ==============

export interface BuscarMovilResultOk {
  ok: true;
  movil: Movil;
}

export interface BuscarMovilResultError {
  ok: false;
  type: 'NO_ENCONTRADO' | 'ERROR';
  message: string;
  detalle?: any;
}

export type BuscarMovilResult = BuscarMovilResultOk | BuscarMovilResultError;

export interface IniciarUsoResultOk {
  ok: true;
  uso_id: number;
  movil: Movil;
  km_inicio: number;
}

export interface IniciarUsoResultError {
  ok: false;
  type: 'NO_AUTH' | 'INSPECTOR_NOT_FOUND' | 'MOVIL_NOT_FOUND' | 'RPC_ERROR' | 'MOVIL_NO_DISPONIBLE';
  message: string;
  detalle?: any;
}

export type IniciarUsoResult = IniciarUsoResultOk | IniciarUsoResultError;

export interface CerrarUsoResultOk {
  ok: true;
  uso_id: number;
  km_recorridos: number;
}

export interface CerrarUsoResultError {
  ok: false;
  type: 'NO_AUTH' | 'INSPECTOR_NOT_FOUND' | 'USO_NOT_FOUND' | 'RPC_ERROR' | 'KM_INVALIDO';
  message: string;
  detalle?: any;
}

export type CerrarUsoResult = CerrarUsoResultOk | CerrarUsoResultError;

export interface ObtenerUsoActivoResultOk {
  ok: true;
  uso: MovilUso;
  movil: Movil;
  km_inicio: number;
}

export interface ObtenerUsoActivoResultError {
  ok: false;
  type: 'NO_AUTH' | 'INSPECTOR_NOT_FOUND' | 'NO_USO_ACTIVO';
  message: string;
  detalle?: any;
}

export type ObtenerUsoActivoResult = ObtenerUsoActivoResultOk | ObtenerUsoActivoResultError;

// ============== FUNCIONES API ==============

/**
 * Busca un móvil por su patente
 */
export async function buscarMovilPorPatente(patente: string): Promise<BuscarMovilResult> {
  if (!patente || patente.trim().length === 0) {
    return {
      ok: false,
      type: 'ERROR',
      message: 'Debes ingresar una patente válida.',
    };
  }

  const patenteNormalizada = patente.trim().toUpperCase();

  const { data, error } = await supabase
    .from('moviles')
    .select('id, patente, tipo_id, marca, modelo, anio, kilometraje_actual, estado, movil_tipo:movil_tipo(id, nombre, descripcion)')
    .eq('patente', patenteNormalizada)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      type: 'ERROR',
      message: 'Error al buscar el móvil.',
      detalle: error,
    };
  }

  if (!data) {
    return {
      ok: false,
      type: 'NO_ENCONTRADO',
      message: `No se encontró un móvil con la patente ${patenteNormalizada}.`,
    };
  }

  // Normalizar movil_tipo
  const movilTipo = Array.isArray(data.movil_tipo)
    ? data.movil_tipo[0] ?? null
    : data.movil_tipo ?? null;

  return {
    ok: true,
    movil: {
      ...data,
      movil_tipo: movilTipo,
    } as Movil,
  };
}

/**
 * Inicia el uso de un móvil para el inspector autenticado
 * Llama a fn_movil_iniciar_uso RPC según el instructivo
 */
export async function iniciarUsoMovil(patente: string, kilometraje_inicio: number): Promise<IniciarUsoResult> {
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

  // 3. Buscar móvil por patente
  const resultBusqueda = await buscarMovilPorPatente(patente);

  if (!resultBusqueda.ok) {
    return {
      ok: false,
      type: 'MOVIL_NOT_FOUND',
      message: resultBusqueda.message,
      detalle: resultBusqueda.detalle,
    };
  }

  const movil = resultBusqueda.movil;

  // 4. Validar que el móvil esté DISPONIBLE
  if (movil.estado !== 'DISPONIBLE') {
    return {
      ok: false,
      type: 'MOVIL_NO_DISPONIBLE',
      message: `El móvil con patente ${movil.patente} no está disponible (estado: ${movil.estado}).`,
    };
  }

  // 5. Llamar RPC fn_movil_iniciar_uso (o hacer proceso manual si no existe)
  // Intentar con RPC primero
  console.log('[iniciarUsoMovil] Llamando RPC con:', { movil_id: movil.id, inspector_id: inspector.id, km: kilometraje_inicio });
  let { data: rpcData, error: rpcError } = await supabase.rpc('fn_movil_iniciar_uso', {
    p_movil_id: movil.id,
    p_inspector_id: inspector.id,
    p_kilometraje_inicio: kilometraje_inicio,
    p_turno_id: null,
  });

  console.log('[iniciarUsoMovil] Resultado RPC:', { data: rpcData, error: rpcError });

  // Si el RPC no existe, intentar proceso manual
  if (rpcError && rpcError.message?.includes('function') && rpcError.message?.includes('does not exist')) {
    console.log('[iniciarUsoMovil] RPC no existe, usando proceso manual para iniciar uso de móvil');
    
    // Crear uso manualmente
    console.log('[iniciarUsoMovil] Insertando en movil_usos...');
    const { data: usoData, error: usoError } = await supabase
      .from('movil_usos')
      .insert({
        movil_id: movil.id,
        inspector_id: inspector.id,
        turno_id: null,
        inicio_ts: new Date().toISOString(),
      })
      .select('id')
      .single();

    console.log('[iniciarUsoMovil] Resultado insert movil_usos:', { data: usoData, error: usoError });

    if (usoError || !usoData) {
      return {
        ok: false,
        type: 'RPC_ERROR',
        message: `Error al crear el uso del móvil: ${usoError?.message || 'Error desconocido'}`,
        detalle: usoError,
      };
    }

    // Registrar lectura de kilometraje inicial
    console.log('[iniciarUsoMovil] Insertando en movil_uso_kilometraje...');
    const { error: kmError } = await supabase
      .from('movil_uso_kilometraje')
      .insert({
        uso_id: usoData.id,
        tipo_lectura: 'INICIO',
        kilometraje: kilometraje_inicio,
        lectura_ts: new Date().toISOString(),
      });

    console.log('[iniciarUsoMovil] Resultado insert kilometraje:', { error: kmError });

    if (kmError) {
      return {
        ok: false,
        type: 'RPC_ERROR',
        message: `Error al registrar kilometraje inicial: ${kmError.message}`,
        detalle: kmError,
      };
    }

    // Actualizar estado del móvil a ASIGNADO
    console.log('[iniciarUsoMovil] Actualizando estado del móvil a ASIGNADO...');
    const { error: updateMovilError } = await supabase
      .from('moviles')
      .update({ estado: 'ASIGNADO' })
      .eq('id', movil.id);

    if (updateMovilError) {
      console.log('[iniciarUsoMovil] ⚠️ Error al actualizar estado del móvil:', updateMovilError);
    }

    console.log('[iniciarUsoMovil] ✅ Proceso manual completado exitosamente');
    return {
      ok: true,
      uso_id: usoData.id,
      movil: {
        ...movil,
        estado: 'ASIGNADO',
      },
      km_inicio: kilometraje_inicio,
    };
  }

  if (rpcError) {
    console.log('[iniciarUsoMovil] ❌ Error RPC:', rpcError);
    return {
      ok: false,
      type: 'RPC_ERROR',
      message: `Error al iniciar el uso del móvil: ${rpcError.message || JSON.stringify(rpcError)}`,
      detalle: rpcError,
    };
  }

  // La función RPC devuelve el uso_id creado
  const usoCreado = rpcData as { uso_id: number } | number | null;
  const usoId = typeof usoCreado === 'number' ? usoCreado : (usoCreado as any)?.uso_id ?? 0;

  console.log('[iniciarUsoMovil] ✅ RPC completado exitosamente, uso_id:', usoId);
  
  // El RPC debería haber actualizado el estado, pero actualizamos el objeto para la UI
  return {
    ok: true,
    uso_id: usoId,
    movil: {
      ...movil,
      estado: 'ASIGNADO',
    },
    km_inicio: kilometraje_inicio,
  };
}

/**
 * Cierra el uso actual del móvil del inspector autenticado
 * Llama a fn_movil_cerrar_uso RPC según el instructivo
 */
export async function cerrarUsoMovil(kilometraje_fin: number): Promise<CerrarUsoResult> {
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

  // 3. Buscar uso activo (sin fin_ts)
  const { data: usoActivo, error: usoError } = await supabase
    .from('movil_usos')
    .select('id, movil_id, inicio_ts')
    .eq('inspector_id', inspector.id)
    .is('fin_ts', null)
    .order('inicio_ts', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (usoError) {
    return {
      ok: false,
      type: 'RPC_ERROR',
      message: 'Error al buscar el uso activo.',
      detalle: usoError,
    };
  }

  if (!usoActivo) {
    return {
      ok: false,
      type: 'USO_NOT_FOUND',
      message: 'No tienes un móvil en uso activo para cerrar.',
    };
  }

  // 4. Obtener kilometraje de inicio para validar
  console.log('[cerrarUsoMovil] Buscando kilometraje inicial para uso_id:', usoActivo.id);
  const { data: lecturaInicio, error: lecturaError } = await supabase
    .from('movil_uso_kilometraje')
    .select('kilometraje')
    .eq('uso_id', usoActivo.id)
    .eq('tipo_lectura', 'INICIO')
    .maybeSingle();

  console.log('[cerrarUsoMovil] Lectura inicial:', { data: lecturaInicio, error: lecturaError });

  let kmInicio = 0;

  if (lecturaInicio) {
    kmInicio = lecturaInicio.kilometraje;
    console.log('[cerrarUsoMovil] Usando km inicial de lectura:', kmInicio);
  } else {
    // Si no hay lectura, buscar el kilometraje actual del móvil
    console.log('[cerrarUsoMovil] No se encontró lectura inicial, buscando km actual del móvil...');
    const { data: movilData, error: movilError } = await supabase
      .from('moviles')
      .select('kilometraje_actual')
      .eq('id', usoActivo.movil_id)
      .single();

    if (movilError || !movilData) {
      return {
        ok: false,
        type: 'RPC_ERROR',
        message: 'No se pudo obtener el kilometraje del móvil.',
        detalle: movilError,
      };
    }

    kmInicio = movilData.kilometraje_actual;
    console.log('[cerrarUsoMovil] Usando km actual del móvil como inicial:', kmInicio);
  }

  // Validar que km_fin >= km_inicio
  if (kilometraje_fin < kmInicio) {
    return {
      ok: false,
      type: 'KM_INVALIDO',
      message: `El kilometraje final (${kilometraje_fin}) debe ser igual o mayor al inicial (${kmInicio}).`,
    };
  }

  // 5. Llamar RPC fn_movil_cerrar_uso (o hacer proceso manual si no existe)
  let { error: rpcError } = await supabase.rpc('fn_movil_cerrar_uso', {
    p_uso_id: usoActivo.id,
    p_kilometraje_fin: kilometraje_fin,
  });

  // Si el RPC no existe, hacer proceso manual
  if (rpcError && rpcError.message?.includes('function') && rpcError.message?.includes('does not exist')) {
    console.log('RPC no existe, usando proceso manual para cerrar uso de móvil');
    
    // Registrar lectura FIN
    const { error: kmError } = await supabase
      .from('movil_uso_kilometraje')
      .insert({
        uso_id: usoActivo.id,
        tipo_lectura: 'FIN',
        kilometraje: kilometraje_fin,
        lectura_ts: new Date().toISOString(),
      });

    if (kmError) {
      return {
        ok: false,
        type: 'RPC_ERROR',
        message: `Error al registrar kilometraje final: ${kmError.message}`,
        detalle: kmError,
      };
    }

    // Actualizar uso con fin_ts y km_recorridos
    const kmRecorridos = kilometraje_fin - kmInicio;
    console.log('[cerrarUsoMovil] Km recorridos calculados:', kmRecorridos);
    const { error: updateError } = await supabase
      .from('movil_usos')
      .update({
        fin_ts: new Date().toISOString(),
        km_recorridos: kmRecorridos,
      })
      .eq('id', usoActivo.id);

    if (updateError) {
      return {
        ok: false,
        type: 'RPC_ERROR',
        message: `Error al cerrar el uso: ${updateError.message}`,
        detalle: updateError,
      };
    }

    // Actualizar estado del móvil a DISPONIBLE y su kilometraje
    console.log('[cerrarUsoMovil] Actualizando móvil a DISPONIBLE con km:', kilometraje_fin);
    const { error: updateMovilError } = await supabase
      .from('moviles')
      .update({ 
        estado: 'DISPONIBLE',
        kilometraje_actual: kilometraje_fin,
      })
      .eq('id', usoActivo.movil_id);

    if (updateMovilError) {
      console.log('[cerrarUsoMovil] ⚠️ Error al actualizar móvil:', updateMovilError);
    }

    return {
      ok: true,
      uso_id: usoActivo.id,
      km_recorridos: kmRecorridos,
    };
  }

  if (rpcError) {
    return {
      ok: false,
      type: 'RPC_ERROR',
      message: `Error al cerrar el uso del móvil: ${rpcError.message || JSON.stringify(rpcError)}`,
      detalle: rpcError,
    };
  }

  const kmRecorridos = kilometraje_fin - kmInicio;
  console.log('[cerrarUsoMovil] ✅ Uso cerrado exitosamente. Km recorridos:', kmRecorridos);

  return {
    ok: true,
    uso_id: usoActivo.id,
    km_recorridos: kmRecorridos,
  };
}

/**
 * Obtiene el uso activo del inspector autenticado (si existe)
 */
export async function obtenerUsoActivo(): Promise<ObtenerUsoActivoResult> {
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

  // 3. Buscar uso activo con datos del móvil
  const { data: usoActivo, error: usoError } = await supabase
    .from('movil_usos')
    .select(`
      id, 
      movil_id, 
      inspector_id, 
      turno_id, 
      inicio_ts, 
      fin_ts, 
      km_recorridos,
      moviles:movil_id (
        id, 
        patente, 
        tipo_id, 
        marca, 
        modelo, 
        anio, 
        kilometraje_actual, 
        estado,
        movil_tipo:movil_tipo(id, nombre, descripcion)
      )
    `)
    .eq('inspector_id', inspector.id)
    .is('fin_ts', null)
    .order('inicio_ts', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (usoError) {
    return {
      ok: false,
      type: 'NO_USO_ACTIVO',
      message: 'Error al buscar el uso activo.',
      detalle: usoError,
    };
  }

  if (!usoActivo) {
    return {
      ok: false,
      type: 'NO_USO_ACTIVO',
      message: 'No tienes un móvil en uso activo.',
    };
  }

  // 4. Obtener kilometraje de inicio
  const { data: lecturaInicio, error: lecturaError } = await supabase
    .from('movil_uso_kilometraje')
    .select('kilometraje')
    .eq('uso_id', usoActivo.id)
    .eq('tipo_lectura', 'INICIO')
    .single();

  if (lecturaError || !lecturaInicio) {
    return {
      ok: false,
      type: 'NO_USO_ACTIVO',
      message: 'No se encontró el kilometraje de inicio.',
      detalle: lecturaError,
    };
  }

  // Normalizar movil
  const movilRaw = (usoActivo as any).moviles;
  const movil = Array.isArray(movilRaw) ? movilRaw[0] : movilRaw;

  if (!movil) {
    return {
      ok: false,
      type: 'NO_USO_ACTIVO',
      message: 'No se encontró el móvil asociado al uso.',
    };
  }

  // Normalizar movil_tipo
  const movilTipo = Array.isArray(movil.movil_tipo)
    ? movil.movil_tipo[0] ?? null
    : movil.movil_tipo ?? null;

  return {
    ok: true,
    uso: {
      id: usoActivo.id,
      movil_id: usoActivo.movil_id,
      inspector_id: usoActivo.inspector_id,
      turno_id: usoActivo.turno_id ?? undefined,
      inicio_ts: usoActivo.inicio_ts,
      fin_ts: usoActivo.fin_ts ?? undefined,
      km_recorridos: usoActivo.km_recorridos ?? undefined,
    },
    movil: {
      ...movil,
      movil_tipo: movilTipo,
    } as Movil,
    km_inicio: lecturaInicio.kilometraje,
  };
}
