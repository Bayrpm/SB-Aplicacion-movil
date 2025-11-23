// app/features/profileInspector/context/movilContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Movil, obtenerUsoActivo } from '../api/dataMovil.api';

interface MovilContextData {
  movilActivo: boolean;
  datosMovilActivo: { movil: Movil; km_inicio: number } | null;
  loadingMovil: boolean;
  setMovilActivo: (activo: boolean) => void;
  setDatosMovilActivo: (datos: { movil: Movil; km_inicio: number } | null) => void;
  recargarMovilActivo: () => Promise<void>;
}

const MovilContext = createContext<MovilContextData | undefined>(undefined);

const STORAGE_KEY = '@movil_activo_cache';

export function MovilProvider({ children }: { children: React.ReactNode }) {
  const [movilActivo, setMovilActivo] = useState(false);
  const [datosMovilActivo, setDatosMovilActivo] = useState<{ movil: Movil; km_inicio: number } | null>(null);
  const [loadingMovil, setLoadingMovil] = useState(true);

  // Guardar en AsyncStorage cuando cambia el estado del móvil
  const guardarEstadoMovil = useCallback(async (activo: boolean, datos: { movil: Movil; km_inicio: number } | null) => {
    try {
      if (activo && datos) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
        console.log('[MovilContext] Estado del móvil guardado en cache');
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
        console.log('[MovilContext] Cache del móvil eliminado');
      }
    } catch (error) {
      console.error('[MovilContext] Error al guardar estado del móvil:', error);
    }
  }, []);

  const recargarMovilActivo = useCallback(async () => {
    console.log('[MovilContext] Recargando estado del móvil activo...');
    setLoadingMovil(true);
    
    // Primero intentar cargar desde cache
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const datosCache = JSON.parse(cached);
        console.log('[MovilContext] Móvil cargado desde cache:', datosCache.movil.patente);
        setMovilActivo(true);
        setDatosMovilActivo(datosCache);
      }
    } catch (error) {
      console.error('[MovilContext] Error al leer cache:', error);
    }

    // Luego verificar con la BD
    const result = await obtenerUsoActivo();
    console.log('[MovilContext] Resultado de obtenerUsoActivo:', {
      ok: result.ok,
      type: result.ok ? 'success' : result.type,
      movil: result.ok ? result.movil.patente : 'N/A',
    });
    
    if (result.ok) {
      console.log('[MovilContext] ✅ Móvil activo encontrado en BD:', result.movil.patente, 'km_inicio:', result.km_inicio);
      const datos = {
        movil: result.movil,
        km_inicio: result.km_inicio,
      };
      setMovilActivo(true);
      setDatosMovilActivo(datos);
      await guardarEstadoMovil(true, datos);
    } else if (result.type === 'NO_USO_ACTIVO') {
      // Solo limpiar si confirmamos que NO hay uso activo
      console.log('[MovilContext] ❌ Confirmado: No hay móvil activo en BD');
      setMovilActivo(false);
      setDatosMovilActivo(null);
      await guardarEstadoMovil(false, null);
    } else {
      // Error de conexión u otro - mantener cache si existe
      console.log('[MovilContext] ⚠️ Error al verificar móvil (mantener cache):', result.type);
      // No modificar el estado si hay error temporal
    }
    
    setLoadingMovil(false);
  }, [guardarEstadoMovil]);

  // Cargar el estado inicial una sola vez
  useEffect(() => {
    console.log('[MovilContext] useEffect - Cargando estado inicial del móvil');
    recargarMovilActivo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo se ejecuta una vez al montar

  return (
    <MovilContext.Provider
      value={{
        movilActivo,
        datosMovilActivo,
        loadingMovil,
        setMovilActivo,
        setDatosMovilActivo,
        recargarMovilActivo,
      }}
    >
      {children}
    </MovilContext.Provider>
  );
}

export function useMovil() {
  const context = useContext(MovilContext);
  if (context === undefined) {
    throw new Error('useMovil debe usarse dentro de MovilProvider');
  }
  return context;
}
