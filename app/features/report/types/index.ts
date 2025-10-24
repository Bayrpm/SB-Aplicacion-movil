export type ReportCategory = {
  idx: number;
  id: number;
  nombre: string;
  descripcion: string;
  orden: number;
  activo: boolean;
  created_at: string;
};

export const DEFAULT_REPORT_CATEGORIES: ReportCategory[] = [
  { idx: 0, id: 1, nombre: 'Emergencias', descripcion: 'Accidentes, incendios, rescates y situaciones urgentes', orden: 1, activo: true, created_at: '2025-10-18T21:49:27.448185Z' },
  { idx: 1, id: 2, nombre: 'Violencia y agresiones', descripcion: 'Peleas, amenazas, lesiones, violencia intrafamiliar o de terceros', orden: 2, activo: true, created_at: '2025-10-18T21:49:27.448185Z' },
  { idx: 2, id: 3, nombre: 'Robos y daños', descripcion: 'Robos, hurtos, daños a la propiedad, vandalismo, receptación', orden: 3, activo: true, created_at: '2025-10-18T21:49:27.448185Z' },
  { idx: 3, id: 4, nombre: 'Drogas', descripcion: 'Consumo o venta de drogas, microtráfico', orden: 4, activo: true, created_at: '2025-10-18T21:49:27.448185Z' },
  { idx: 4, id: 5, nombre: 'Armas', descripcion: 'Porte, uso o tenencia de armas y municiones', orden: 5, activo: true, created_at: '2025-10-18T21:49:27.448185Z' },
  { idx: 5, id: 6, nombre: 'Incivilidades', descripcion: 'Ruidos, desórdenes, consumo en vía pública, mal uso de espacios', orden: 6, activo: true, created_at: '2025-10-18T21:49:27.448185Z' },
  { idx: 6, id: 7, nombre: 'Patrullaje municipal', descripcion: 'Apoyo, rondas, controles y acciones de patrullaje', orden: 7, activo: true, created_at: '2025-10-18T21:49:27.448185Z' },
  { idx: 7, id: 8, nombre: 'Otros', descripcion: 'Hechos que no calzan en las categorías anteriores', orden: 8, activo: true, created_at: '2025-10-18T21:49:27.448185Z' },
];

// Misma razón que en el hook: este archivo está dentro de `app/` y expo-router
// lo ve como una ruta. No es una pantalla; añadimos un default export
// de un componente vacío para silenciar el warning del router.
export default function _ReportTypesRoute(): null { return null; }
