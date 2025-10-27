type Snapshot = {
  titulo?: string;
  descripcion?: string;
  anonimo?: boolean;
  ubicacionTexto?: string;
  coords?: { x?: number; y?: number };
  categoryId?: number | null;
};

const bridge: { snap?: Snapshot } = {};

export function setReportFormSnapshot(s: Snapshot) { bridge.snap = s; }
export function getReportFormSnapshot(): Snapshot | undefined { return bridge.snap; }
export function clearReportFormSnapshot() { delete bridge.snap; }

export default bridge;
