/**
 * Convierte una fecha ISO a formato relativo en español
 * Ejemplos: "hace 5 minutos", "hace 2 horas", "hace 3 días", "hace 2 meses"
 */
export function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  // Menos de 1 minuto
  if (diffSeconds < 60) {
    return 'ahora';
  }

  // Minutos (menos de 1 hora)
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
  }

  // Horas (menos de 24 horas)
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  }

  // Días (menos de 30 días)
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  }

  // Meses
  const diffMonths = Math.floor(diffDays / 30);
  return `hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
}

// Default export para Expo Router
export default function __expo_router_placeholder__(): any {
  return null;
}
