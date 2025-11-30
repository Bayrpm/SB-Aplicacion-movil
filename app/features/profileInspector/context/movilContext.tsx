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
} else if (!movilActivo) {
          await AsyncStorage.removeItem(STORAGE_KEY);
}
      } catch (error) {
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
} else {
        await AsyncStorage.removeItem(STORAGE_KEY);
}
    } catch (error) {
}
  }, []);

  const recargarMovilActivo = useCallback(async () => {
    setLoadingMovil(true);
    
    // Primero intentar cargar desde cache
    let hayCacheValido = false;
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
if (cached) {
        const datosCache = JSON.parse(cached);
setMovilActivo(true);
        setDatosMovilActivo(datosCache);
        hayCacheValido = true;
      } else {
}
    } catch (error) {
}

    // Luego verificar con la BD
const result = await obtenerUsoActivo();
if (result.ok) {
const datos = {
        movil: result.movil,
        km_inicio: result.km_inicio,
      };
      setMovilActivo(true);
      setDatosMovilActivo(datos);
      await guardarEstadoMovil(true, datos);
    } else if (result.type === 'NO_USO_ACTIVO') {
      // Solo limpiar si confirmamos que NO hay uso activo
setMovilActivo(false);
      setDatosMovilActivo(null);
      await guardarEstadoMovil(false, null);
    } else {
      // Error de conexión u otro - mantener cache si existe
if (!hayCacheValido) {
setMovilActivo(false);
        setDatosMovilActivo(null);
      } else {
}
    }
    
    setLoadingMovil(false);
}, [guardarEstadoMovil]);

  // Cargar el estado inicial una sola vez
  useEffect(() => {
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