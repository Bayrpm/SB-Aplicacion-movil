// Fallback for using MaterialIcons on Android and web.
import { Ionicons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';
// FontAwesome 6 (SVG) - requiere instalar las dependencias oficiales
// npm install @fortawesome/fontawesome-svg-core @fortawesome/free-brands-svg-icons @fortawesome/react-native-fontawesome

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'person': 'person',
  'person.fill': 'person',
  'notification': 'notifications-none',
  'notification.fill': 'notifications',
  'location': 'place',
  'location.fill': 'place',
} as unknown as IconMapping;

// Mapeo a FontAwesome5 (para iconos que no existen en MaterialIcons)
const FA_MAPPING: Record<string, string> = {
  // nombre a usar desde IconSymbol -> nombre en FontAwesome5
  'x-twitter': 'x-twitter', // usa el icono 'x' como sustituto de 'square-x-twitter'
  // redes sociales y brands (usadas en FollowSection y reportes)
  'instagram': 'instagram',
  'facebook': 'facebook',
  'youtube': 'youtube',
  'user-secret': 'user-secret',
  // alias corto para X/Twitter
  'x': 'x',
};

// Mapeo a MaterialCommunityIcons (MC)
const MC_MAPPING: Record<string, string> = {
  'compass-rose': 'compass-rose',
  'arrow-left': 'arrow-left',
  'camera': 'camera',
  'image': 'image',
  'map-marker': 'map-marker',
  'send': 'send',
  'close': 'close',
  // report category icons (MaterialCommunityIcons)
  'ambulance': 'ambulance',
  'alert-circle-outline': 'alert-circle-outline',
  'shield-alert': 'shield-alert',
  'pill': 'pill',
  'pistol': 'pistol',
  'bell-ring-outline': 'bell-ring-outline',
  'police-badge': 'police-badge',
  'dots-horizontal': 'dots-horizontal',
};

// Mapeo a Ionicons
const IONIC_MAPPING: Record<string, string> = {
  'megaphone-outline': 'megaphone-outline',
  'eye': 'eye',
  'eye-off': 'eye-off',
  'checkmark-circle': 'checkmark-circle',
  'close-circle': 'close-circle',
};

// Añadir entradas explícitas para MaterialIcons usadas en el proyecto
const EXTRA_MATERIAL: Record<string, string> = {
  'edit-location-alt': 'edit-location-alt',
  'search': 'search',
  'close': 'close',
  'my-location': 'my-location',
  'arrow-drop-up': 'arrow-drop-up',
  'location-searching': 'location-searching',
  'gps-fixed': 'gps-fixed',
};

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  // allow either a known mapped icon name or any string (fallback)
  name: string | IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const key = name as string;

  // Ionicons (alta prioridad si el mapping existe)
  if (IONIC_MAPPING[key]) {
    return <Ionicons name={IONIC_MAPPING[key] as any} size={size} color={color as any} style={style} />;
  }

  // MaterialCommunityIcons
  if (MC_MAPPING[key]) {
    return <MaterialCommunityIcons name={MC_MAPPING[key] as any} size={size} color={color as any} style={style} />;
  }

  // FontAwesome5
  if (FA_MAPPING[key]) {
    const faName = FA_MAPPING[key];
    return <FontAwesome6 color={color} size={size} name={faName as any} style={style} />;
  }

  // MaterialIcons explicit extras or fallback to MAPPING/default
  const materialName = EXTRA_MATERIAL[key] ?? MAPPING[name as IconSymbolName] ?? (name as unknown as string);
  return <MaterialIcons color={color} size={size} name={materialName as any} style={style} />;
}
