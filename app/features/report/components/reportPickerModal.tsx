import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, PixelRatio, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReportCategories } from '../hooks/useReportCategories';
import type { ReportCategory } from '../types';

type Props = {
  visible: boolean;
  onClose: () => void;
  tabBarHeight?: number;
};

export default function ReportPickerModal({ visible, onClose, tabBarHeight }: Props) {
  const router = useRouter();
  const categories = useReportCategories();
  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;
  const windowWidth = Dimensions.get('window').width;

  // Normalización simple basada en ancho de referencia para mantener tamaños visuales consistentes
  const GUIDELINE_BASE_WIDTH = 375; // iPhone 8 ancho como referencia
  const scale = windowWidth / GUIDELINE_BASE_WIDTH;
  const normalize = (size: number) => PixelRatio.roundToNearestPixel(size * scale);

  // Ajusta si tu tab bar tiene otra altura (puede venir desde el layout)
  // Cuando se pasa `tabBarHeight` desde el layout, este valor debe representar
  // la altura total reservada en la parte inferior (tab bar base + safe area / nav bar).
  // Si no se pasa, calculamos el valor por defecto como safe area + 56.
  const TAB_BAR_HEIGHT = tabBarHeight ?? (insets.bottom + 56);

  // bottomSpacing = espacio que dejamos para la tab bar (TAB_BAR_HEIGHT ya incluye el safe-area si fue provisto)
  const bottomSpacing = TAB_BAR_HEIGHT;

  // Evitar panel excesivamente alto; ajusta el -80 según tu diseño
  const maxPanelHeight = Math.max(240, windowHeight - bottomSpacing - 80);

  // Responsiveness
  const isSmall = windowWidth < 360;
  const ITEM_HEIGHT = isSmall ? normalize(84) : normalize(100);
  const ICON_WRAPPER_SIZE = isSmall ? normalize(56) : normalize(64);
  const ICON_SIZE = isSmall ? normalize(24) : normalize(28);

  const handleSelect = (cat: ReportCategory) => {
    onClose();
    try {
      router.push({ pathname: '/citizen/citizenReport', params: { categoryId: String(cat.id) } });
    } catch (e) {
      try {
        router.replace('/citizen/citizenReport');
      } catch {}
    }
  };

  const ICON_MAP: Record<number, string> = {
    1: 'ambulance',
    2: 'alert-circle-outline',
    3: 'shield-alert',
    4: 'pill',
    5: 'pistol',
    6: 'bell-ring-outline',
    7: 'police-badge',
    8: 'dots-horizontal',
  };

  if (!visible) return null;

  return (
    <View style={styles.absoluteRoot} pointerEvents="box-none">
      {/* Overlay oscuro: ocupa desde top hasta justo arriba de la tab bar */}
      <TouchableOpacity
        style={[styles.overlay, { bottom: bottomSpacing }]}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Panel anclado al fondo (encima de la tab bar) */}
    {/* containerAbsolute se posiciona encima del contenido pero dejamos espacio abajo (bottomSpacing)
      para que la tab bar quede siempre visible encima del overlay. */}
    <View style={[styles.containerAbsolute, { bottom: bottomSpacing, maxHeight: maxPanelHeight }]} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.closeBtn, { marginTop: Math.max(6, insets.top - 4) }]}
          onPress={onClose}
          accessibilityRole="button"
        >
          <Text style={styles.closeText}>Cancelar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>¿Qué quieres reportar?</Text>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {categories.map((c) => (
            <TouchableOpacity key={c.id} style={[styles.item, { height: ITEM_HEIGHT }]} onPress={() => handleSelect(c)} accessibilityRole="button">
              <View style={[styles.iconWrap, { width: ICON_WRAPPER_SIZE, height: ICON_WRAPPER_SIZE, borderRadius: ICON_WRAPPER_SIZE / 2 }]}>
                <MaterialCommunityIcons name={(ICON_MAP[c.id] as any) ?? 'map-marker'} size={ICON_SIZE} color="#fff" />
              </View>
              <Text style={styles.itemLabel}>{c.nombre}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  containerAbsolute: {
    position: 'absolute',
    left: '4%',
    right: '4%',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scroll: { width: '100%' },
  closeBtn: {
    alignSelf: 'flex-start',
    marginLeft: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0A4A90',
  },
  closeText: { color: '#fff', fontWeight: '700' },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 12,
    alignItems: 'flex-start',
  },
  item: {
    width: '30%',
    marginHorizontal: '1.66%',
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0A4A90',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    elevation: 6,
  },
  itemLabel: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
  },
});