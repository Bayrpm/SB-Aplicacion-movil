import { useMemo } from 'react';
import { DEFAULT_REPORT_CATEGORIES, ReportCategory } from '../types';

export function useReportCategories(): ReportCategory[] {
  // For now return the default static list. Later this hook can fetch remote categories.
  return useMemo(() => DEFAULT_REPORT_CATEGORIES.slice().sort((a, b) => a.orden - b.orden), []);
}

// Expo Router treats files inside `app/` as routes. This hook is not a route,
// but to silence the runtime warning about missing default export we provide
// a harmless default component (it will not be used at runtime by the UI).
export default function _ReportCategoriesRoute(): null {
  return null;
}
