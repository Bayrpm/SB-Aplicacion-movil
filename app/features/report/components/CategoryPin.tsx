import React from 'react';
import { Dimensions, PixelRatio, Platform, Text as RNText, StyleSheet, View } from 'react-native';
import { IconSymbol } from '../../../../components/ui/icon-symbol';

const DPR = PixelRatio.get();
const { width: SCREEN_W } = Dimensions.get('window');
const SCALE = Math.min(Math.max(SCREEN_W / 360, 0.85), 1.25);

type Props = {
  iconName: string;
  pinColor?: string;
  size?: number; // base head diameter in dp (optional)
  count?: number; // número de denuncias agrupadas (opcional, para mostrar badge)
};

export default function CategoryPin({ iconName, pinColor = '#FF3B30', size, count }: Props) {
  const PIN_SIZE = Math.round((size ?? 56) * SCALE);
  const TIP_H = Math.max(8, Math.round(PIN_SIZE * 0.22));
  const HEAD = PIN_SIZE;
  const INNER = Math.round(HEAD * 0.52);
  const ICON_SZ = Math.round(INNER * 0.55);
  const showBadge = count && count > 1;
  const BADGE_SIZE = 30;

  // Tamaño del contenedor: reservar espacio extra suficiente para el badge y las sombras
  // - Añadimos más espacio para asegurar que todo se capture en el snapshot
  const CONTAINER_W = HEAD + (showBadge ? BADGE_SIZE + 10 : 10); // +10 para padding y sombras
  const CONTAINER_H = HEAD + TIP_H + (showBadge ? BADGE_SIZE : 10); // +10 para padding y sombras

  return (
    <View
      style={{
        width: CONTAINER_W,
        height: CONTAINER_H,
        alignItems: 'center',
        // Importante: mantener la punta exactamente en el borde inferior
        // para que anchor { x: 0.5, y: 1 } del Marker coincida con la coordenada.
        justifyContent: 'flex-end',
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      <View
        style={{
          width: HEAD,
          height: HEAD,
          borderRadius: HEAD / 2,
          backgroundColor: pinColor,
          borderWidth: Math.max(2, Math.round(HEAD * 0.05)),
          borderColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          position: 'relative',
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 2 },
            android: { elevation: 3 },
            default: {},
          }),
        }}
      >
        <View style={[styles.inner, { width: INNER, height: INNER, borderRadius: INNER / 2 }]}> 
          <IconSymbol name={iconName as any} size={ICON_SZ} color="#0A4A90" />
        </View>
        {showBadge && (
          <View
            style={{
              position: 'absolute',
              // mitad dentro (negativo) y mitad fuera del círculo
              top: -BADGE_SIZE / 3,
              right: -BADGE_SIZE / 4,
              backgroundColor: '#0A4A90',
              minWidth: BADGE_SIZE,
              height: BADGE_SIZE,
              borderRadius: BADGE_SIZE / 2,
              paddingHorizontal: 8,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: '#fff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.5,
              shadowRadius: 4,
              elevation: 10,
            }}
          >
            <RNText style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>
              {count}
            </RNText>
          </View>
        )}
      </View>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: Math.max(6, Math.round(PIN_SIZE * 0.18)),
          borderRightWidth: Math.max(6, Math.round(PIN_SIZE * 0.18)),
          borderTopWidth: TIP_H,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: pinColor,
          marginTop: -2,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'flex-start', overflow: 'visible' },
  head: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FFFFFF',
    overflow: 'visible',
    // shadow
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 2 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  inner: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
});
