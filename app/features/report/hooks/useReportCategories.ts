import { useEffect, useMemo, useState } from 'react';
import { fetchReportCategories } from '../api/report.api';
import type { ReportCategory } from '../types';

/**
 * Hook que devuelve las categorías de reportes.
 * - Intenta cargar desde la API (Supabase). Si falla, devuelve arreglo vacío.
 */
export function useReportCategories(): ReportCategory[] {
  const [remote, setRemote] = useState<ReportCategory[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cats = await fetchReportCategories();
        if (mounted && Array.isArray(cats)) {
          setRemote(cats);
        }
      } catch {
        // ignore - si falla, remote queda null y el hook devolverá []
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Devolvemos las categorías remotas cuando estén; si no, devolvemos arreglo vacío.
  // Asignamos `idx` según el orden final para consistencia en la UI.
  const final = useMemo(() => {
    const src = remote ?? [];
    return src.slice().sort((a, b) => a.orden - b.orden).map((c, i) => ({ ...c, idx: i }));
  }, [remote]);

  return final;
}

// Expo Router treats files inside `app/` as routes. This hook is not a route,
// but to silence the runtime warning about missing default export we provide
// a harmless default component (it will not be used at runtime by the UI).
export default function _ReportCategoriesRoute(): null {
  return null;
}
