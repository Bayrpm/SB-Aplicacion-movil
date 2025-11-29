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

  // Guardar en AsyncStorage automáticamente cuando cambian los estados
  useEffect(() => {
    const guardarEnCache = async () => {
      try {
        if (movilActivo && datosMovilActivo) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(datosMovilActivo));
          console.log('[MovilContext] 💾 Estado del móvil guardado automáticamente en cache:', datosMovilActivo.movil.patente);
        } else if (!movilActivo) {
          await AsyncStorage.removeItem(STORAGE_KEY);
          console.log('[MovilContext] 🗑️ Cache del móvil eliminado automáticamente');
        }
      } catch (error) {
        console.error('[MovilContext] ❌ Error al guardar estado del móvil:', error);
      }
    };

    // Solo guardar si no está en loading (evitar guardado durante inicialización)
    if (!loadingMovil) {
      guardarEnCache();
    }
  }, [movilActivo, datosMovilActivo, loadingMovil]);

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
    console.log('[MovilContext] ========================================');
    console.log('[MovilContext] 🔄 Recargando estado del móvil activo...');
    setLoadingMovil(true);
    
    // Primero intentar cargar desde cache
    let hayCacheValido = false;
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      console.log('[MovilContext] 📦 Cache encontrado:', !!cached);
      if (cached) {
        const datosCache = JSON.parse(cached);
        console.log('[MovilContext] ✅ Móvil cargado desde cache:', datosCache.movil.patente, 'km:', datosCache.km_inicio);
        setMovilActivo(true);
        setDatosMovilActivo(datosCache);
        hayCacheValido = true;
      } else {
        console.log('[MovilContext] ⚠️ No hay cache guardado');
      }
    } catch (error) {
      console.error('[MovilContext] ❌ Error al leer cache:', error);
    }

    // Luego verificar con la BD
    console.log('[MovilContext] 🔍 Consultando BD...');
    const result = await obtenerUsoActivo();
    console.log('[MovilContext] 📊 Resultado de obtenerUsoActivo:', {
      ok: result.ok,
      type: result.ok ? 'success' : result.type,
      movil: result.ok ? result.movil.patente : 'N/A',
      km_inicio: result.ok ? result.km_inicio : 'N/A',
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
      console.log('[MovilContext] ⚠️ Error al verificar móvil (mantener cache):', result.type, result.message);
      if (!hayCacheValido) {
        console.log('[MovilContext] ⚠️ No hay cache válido y BD falló - móvil NO disponible');
        setMovilActivo(false);
        setDatosMovilActivo(null);
      } else {
        console.log('[MovilContext] ✅ Manteniendo móvil desde cache (BD no disponible)');
      }
    }
    
    setLoadingMovil(false);
    console.log('[MovilContext] ========================================');
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

export default {};