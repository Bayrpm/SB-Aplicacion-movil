import type { ColorSchemeName } from 'react-native';

// Estilo oscuro estable para Google Maps
export const DARK_MAP_STYLE: any[] = [
  // Base + labels
  { elementType: 'geometry', stylers: [{ color: '#0b1627' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#eaf2ff' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1627' }] },

  // Agua
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a2740' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#bfe1ff' }] },

  // Límites administrativos
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#23344a' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d6e7ff' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#c7dbff' }] },

  // Paisaje/edificaciones + POI
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#182e50ff' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#0f1d33' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#deebff' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#112b1e' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#b8f8d0' }] },
  { featureType: 'poi.business', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },

  // Autopistas
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2e3f63' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#5d718c' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#e2eeff' }] },

  // Arteriales
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#22344a' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#3b557a' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#d6e7ff' }] },

  // Calles locales (más detalle)
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#18263e' }] },
  { featureType: 'road.local', elementType: 'geometry.stroke', stylers: [{ color: '#2b405f' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#cfe2ff' }] },

  // Íconos de vías visibles (coches, giros, etc.)
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },

  // Tránsito
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#3a7bd5' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#eaf2ff' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
];

// Para tema claro: usa un array vacío para forzar refresco del estilo en MapView
// (algunas versiones no limpian el estilo si se pasa undefined/null).
// Estilo claro explícito para evitar depender de comportamiento de plataforma
export const LIGHT_MAP_STYLE: any[] = [
  // Fondo general: tono suave, no puro blanco
  { elementType: 'geometry', stylers: [{ color: '#eef3f6' }] },
  // Etiquetas: contraste moderado y legible
  { elementType: 'labels.text.fill', stylers: [{ color: '#1f3136' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#eef3f6' }] },

  // Agua: azul más marcado y con ligero stroke para diferenciar del fondo
  // Agua: azul claro y reconocible
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#74b7ff' }] },
  { featureType: 'water', elementType: 'geometry.stroke', stylers: [{ color: '#4fa8ff' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#0f5f8a' }] },

  // Parques/espacios verdes: relleno verde claro y borde suave
  // Parques: verde vivo pero suave
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#87c06b' }] },
  { featureType: 'poi.park', elementType: 'geometry.stroke', stylers: [{ color: '#6aa956' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#114b1a' }] },

  // POI y construcciones: ligeramente desaturado para no competir con calles
  { featureType: 'poi', elementType: 'geometry.fill', stylers: [{ color: '#f4f6f7' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#475259' }] },

  // Calles: fills claros (no grises planos) y strokes definidos para separación
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#ffe6a8' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e0bc6a' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#fffaf0' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#e7ded3' }] },
  { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.local', elementType: 'geometry.stroke', stylers: [{ color: '#d7dde0' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#4a5b5f' }] },

  // Edificaciones y paisaje: tonos neutrales que separan del fondo
  { featureType: 'landscape', elementType: 'geometry.fill', stylers: [{ color: '#eef4f5' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#eef0f1' }] },

  // Límites y admin: ligero gris para definición
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#e3ecf0' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#2f4248' }] },

  // Transporte/transit: neutral y legible
  { featureType: 'transit', elementType: 'geometry.fill', stylers: [{ color: '#eaf0f2' }] },

  // Íconos: mantener visibles
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.business', elementType: 'labels.text.fill', stylers: [{ color: '#2f5055' }] },
  // Reglas explícitas al final para asegurar que parques se muestren verdes
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#87c06b' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#87c06b' }] },
  { featureType: 'poi.park', elementType: 'geometry.stroke', stylers: [{ color: '#6aa956' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#114b1a' }] },
];

export function getMapStyle(scheme: ColorSchemeName) {
  // Dark: aplica estilo; Light/otros: array vacío para limpiar estilo de forma inmediata.
  return scheme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;
}

// Export default vacío para evitar el warning de rutas en Expo Router
export default {};
