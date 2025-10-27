import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';
import React, { useMemo, useRef } from 'react';
import {
  Dimensions,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Item = {
  id: 'carabineros' | 'samu' | 'bomberos' | 'pdi' | 'seguridad' | string;
  number: string;
};

const { width: WINDOW_WIDTH } = Dimensions.get('window');

// Tarjeta angosta/alta como tu mock
const BASE_ITEM_WIDTH  = Math.round(Math.min(Math.max(WINDOW_WIDTH * 0.34, 140), 220));
const ITEM_WIDTH       = Math.round(BASE_ITEM_WIDTH * 0.9);                 // -10% ancho
const ITEM_HEIGHT      = Math.round(BASE_ITEM_WIDTH * 0.9 * 1.05 * 1.10);   // +5% y +10% alto
const ITEM_SPACING     = 8;                                                 // gap lateral de cada card
const ITEM_FULL_WIDTH  = ITEM_WIDTH + ITEM_SPACING * 2;

// Colores por institución
const PALETTE: Record<string, { bg: string; num: string }> = {
  carabineros: { bg: '#129243ff', num: '#ffffffff' },
  bomberos:    { bg: '#d13a3aff', num: '#ffffffff' },
  samu:        { bg: '#e5ca34ff', num: '#0A2E63' },
  pdi:         { bg: '#3663b1ff', num: '#ffe310ff' },
  seguridad:   { bg: '#6FB0DF', num: '#ffffffff' },
};

const getLogo = (id?: string) => {
  switch (id) {
    case 'carabineros': return require('@/assets/images/carabineros.png');
    case 'samu':        return require('@/assets/images/samu.png');
    case 'bomberos':    return require('@/assets/images/bomberos.png');
  // Temporarily use a safe fallback image while we fix the original pdi asset
    case 'pdi':         return require('@/assets/images/pdi_investigaciones.png');
    case 'seguridad':   return require('@/assets/images/seguridad.png');
    default:            return require('@/assets/images/icon.png');
  }
};

const logoScaleFor = (id?: string) => (id === 'seguridad' ? 2.2 : id === 'bomberos' ? 1.1 : 1.0);
const logoMaxFor   = (id?: string) => (id === 'seguridad' ? 220 : 120);

export default function EmergencyCarousel({ items }: { items: Item[] }) {
  const scheme = useColorScheme() ?? 'light';
  const listRef = useRef<FlatList<Item>>(null);

  const data = useMemo(() => items, [items]);

  const renderItem = ({ item }: { item: Item }) => {
    const palette = PALETTE[item.id] ?? { bg: scheme === 'dark' ? '#0b2030' : '#f7fbff', num: '#0A4A90' };

    const NUMBER_FS = Math.max(22, Math.min(64, Math.round(ITEM_HEIGHT * 0.30)));
    const CONTENT_TOP = 12, CONTENT_BOTTOM = 12, LOGO_MB = 10;
    const contentH = ITEM_HEIGHT - CONTENT_TOP - CONTENT_BOTTOM;
    const numberH = Math.round(NUMBER_FS * 1.05);
    const numberAreaH = numberH + 6;
    const EXTRA_LOGO = Math.round(ITEM_HEIGHT * 0.08);
    const logoBoxH = Math.max(40, contentH - numberAreaH - LOGO_MB + EXTRA_LOGO);

    const desired = Math.round(logoBoxH * logoScaleFor(item.id));
    const imageSize = Math.max(36, Math.min(logoMaxFor(item.id), logoBoxH, desired));
    const finalImage = item.id === 'seguridad'
      ? Math.max(imageSize, Math.floor(logoBoxH * 0.95))
      : imageSize;

    const onCall = () => {
      const tel = `tel:${(item.number || '').replace(/\s|-/g, '')}`;
      Linking.openURL(tel).catch(() => {});
    };

    return (
      <Pressable onPress={onCall} style={{ marginHorizontal: ITEM_SPACING }}>
        <View style={[styles.item, { width: ITEM_WIDTH, height: ITEM_HEIGHT, backgroundColor: palette.bg }]}>
          <View style={{ width: logoBoxH, height: logoBoxH, marginBottom: LOGO_MB, justifyContent: 'center', alignItems: 'center' }}>
            <Image
              source={getLogo(item.id)}
              style={{ width: finalImage, height: finalImage, transform: item.id === 'seguridad' ? [{ scale: 1.45 }] : undefined }}
              contentFit="contain"
            />
          </View>

          <Text
            style={[styles.itemNumber, { color: palette.num, fontSize: NUMBER_FS }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            maxFontSizeMultiplier={1.0}
          >
            {item.number}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <FlatList<Item>
        ref={listRef}
        data={data}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        // Carousel normal: sin snaps, sin centrado, sin bucles
        contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 6 }}
        getItemLayout={(_, index) => ({
          length: ITEM_FULL_WIDTH,
          offset: ITEM_FULL_WIDTH * index,
          index,
        })}
        initialNumToRender={4}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'flex-start', // sin centrado
  },
  item: {
    borderRadius: 22,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 5,
  },
  itemNumber: {
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
    alignSelf: 'center',
  },
});
