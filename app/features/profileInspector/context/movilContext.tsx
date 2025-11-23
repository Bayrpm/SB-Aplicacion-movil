// app/features/profileInspector/context/movilContext.tsx
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

export function MovilProvider({ children }: { children: React.ReactNode }) {
  const [movilActivo, setMovilActivo] = useState(false);
  const [datosMovilActivo, setDatosMovilActivo] = useState<{ movil: Movil; km_inicio: number } | null>(null);
  const [loadingMovil, setLoadingMovil] = useState(true);

  const recargarMovilActivo = useCallback(async () => {
    console.log('[MovilContext] Recargando estado del móvil activo...');
    setLoadingMovil(true);
    const result = await obtenerUsoActivo();
    console.log('[MovilContext] Resultado de obtenerUsoActivo:', {
      ok: result.ok,
      type: result.ok ? 'success' : result.type,
      movil: result.ok ? result.movil.patente : 'N/A',
    });
    
    if (result.ok) {
      console.log('[MovilContext] Móvil activo encontrado:', result.movil.patente, 'km_inicio:', result.km_inicio);
      setMovilActivo(true);
      setDatosMovilActivo({
        movil: result.movil,
        km_inicio: result.km_inicio,
      });
    } else {
      console.log('[MovilContext] No hay móvil activo. Razón:', result.type);
      setMovilActivo(false);
      setDatosMovilActivo(null);
    }
    
    setLoadingMovil(false);
  }, []);

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
