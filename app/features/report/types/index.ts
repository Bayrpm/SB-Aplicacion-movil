export type ReportCategory = {
  idx: number;
  id: number;
  nombre: string;
  descripcion: string;
  orden: number;
  activo: boolean;
  icon?: string;
};

// de un componente vacío para silenciar el warning del router.
export default function _ReportTypesRoute(): null { return null; }
