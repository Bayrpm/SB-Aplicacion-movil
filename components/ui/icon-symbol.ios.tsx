import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  // Mapear nombres genéricos usados en la app a SF Symbols válidos en iOS
  const SF_MAPPING: Record<string, SymbolViewProps['name']> = {
    settings: 'gearshape',
    logout: 'rectangle.portrait.and.arrow.right',
    'exit-to-app': 'rectangle.portrait.and.arrow.right',
    close: 'xmark',
    camera: 'camera',
    smartphone: 'iphone',
    notifications: 'bell',
    description: 'doc.text',
    security: 'shield',
    check: 'checkmark',
    'chevron-right': 'chevron.right',
    edit: 'pencil',
    email: 'envelope',
    phone: 'phone',
    'wb-sunny': 'sun.max',
    'nightlight': 'moon',
    'text-fields': 'textformat',
  };

  const mappedName = (SF_MAPPING[(name as string)] ?? name) as SymbolViewProps['name'];
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={mappedName}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
