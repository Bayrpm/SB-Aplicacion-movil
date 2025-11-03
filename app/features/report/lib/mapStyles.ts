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
export const LIGHT_MAP_STYLE: any[] = [];

export function getMapStyle(scheme: ColorSchemeName) {
  // Dark: aplica estilo; Light/otros: array vacío para limpiar estilo de forma inmediata.
  return scheme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;
}

// Export default vacío para evitar el warning de rutas en Expo Router
export default {};
