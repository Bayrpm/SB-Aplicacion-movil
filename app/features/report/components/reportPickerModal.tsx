import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Modal,
  PixelRatio,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReportCategories } from '../hooks/useReportCategories';
import type { ReportCategory } from '../types';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect?: (cat: ReportCategory) => void;
  tabBarHeight?: number;
};

export default function ReportPickerModal({ visible, onClose, onSelect, tabBarHeight }: Props) {
  const router = useRouter();
  const categories = useReportCategories();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = Dimensions.get('window');

  // === Escalado consistente ===
  const BASE_W = 390;
  const BASE_H = 844;
  const scaleW = windowWidth / BASE_W;
  const scaleH = windowHeight / BASE_H;
  const baseScale = Math.min(scaleW, scaleH);
  const moderateScale = (size: number, factor = 0.7) =>
    PixelRatio.roundToNearestPixel(size + (size * baseScale - size) * factor);

  const TAB_BAR_HEIGHT = tabBarHeight ?? insets.bottom + 56;
  const maxPanelHeight = Math.max(240, windowHeight - insets.top - 80);

  // Tamaños (agrandados)
  const ITEM_HEIGHT = moderateScale(112);
  const ICON_WRAPPER_SIZE = moderateScale(76);
  const ICON_SIZE = moderateScale(30);
  const TITLE_SIZE = moderateScale(22);
  const LABEL_SIZE = moderateScale(15);

  // Botón cancelar: más grande que antes
  const CLOSE_SIZE = moderateScale(18); // antes 16
  const CLOSE_PAD_H = moderateScale(18); // antes 14
  const CLOSE_PAD_V = moderateScale(12); // antes 10
  const CLOSE_RADIUS = moderateScale(10); // antes 8

  // === Empuje vertical (contenido) ===
  const isLandscape = windowWidth > windowHeight;
  const TOP_OFFSET_PCT = isLandscape ? 0.06 : 0.10;
  const SAFE_TOP = insets.top + moderateScale(8);
  const AVAILABLE = Math.max(0, maxPanelHeight - SAFE_TOP);
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const TOP_OFFSET_MIN = moderateScale(32);
  const TOP_OFFSET_MAX = moderateScale(96);
  const TOP_OFFSET = clamp(AVAILABLE * TOP_OFFSET_PCT, TOP_OFFSET_MIN, TOP_OFFSET_MAX);

  const handleSelect = (cat: ReportCategory) => {
    onClose();
    // Si el padre proveyó onSelect, lo llamamos (preferible para manejar localmente
    // la apertura del formulario). Si no, caemos al comportamiento anterior.
    if (typeof onSelect === 'function') {
      try { onSelect(cat); return; } catch {}
    }
    try {
      router.push({ pathname: '/citizen/citizenReport', params: { categoryId: String(cat.id) } });
    } catch {
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      hardwareAccelerated={Platform.OS === 'android'}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.absoluteRoot, { top: 0, bottom: 0 }]}>
        {/* overlay visual only: no onPress so taps outside no cierran el modal */}
        <View style={styles.overlay} />

        {/* Panel */}
        <View
          style={[
            styles.containerAbsolute,
            { top: 0, maxHeight: maxPanelHeight, paddingTop: SAFE_TOP, zIndex: 1001 },
          ]}
        >
          {/* Botón cancelar: más abajo y más grande */}
          <TouchableOpacity
            style={[
              styles.closeBtn,
              {
                // ↓ lo bajamos un poco más que antes
                marginTop: moderateScale(22), // antes ~8
                paddingHorizontal: CLOSE_PAD_H,
                paddingVertical: CLOSE_PAD_V,
                borderRadius: CLOSE_RADIUS,
              },
            ]}
            onPress={onClose}
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.closeText, { fontSize: CLOSE_SIZE }]} allowFontScaling={false}>
              Cancelar
            </Text>
          </TouchableOpacity>

          {/* Contenido */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{
              paddingHorizontal: moderateScale(8),
              paddingBottom: TAB_BAR_HEIGHT + moderateScale(12),
              flexGrow: 1,
              justifyContent: 'flex-start',
            }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {/* Empuje superior para ubicar el título y la grilla más abajo */}
            <View style={{ height: TOP_OFFSET }} />

            <Text
              style={[
                styles.title,
                {
                  fontSize: TITLE_SIZE,
                  marginBottom: moderateScale(12),
                  textAlign: 'center',
                  alignSelf: 'center',
                },
              ]}
              allowFontScaling={false}
            >
              ¿Qué quieres reportar?
            </Text>

            <View style={[styles.grid, { alignContent: 'center' }]}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.item, { height: ITEM_HEIGHT, marginVertical: moderateScale(10) }]}
                  onPress={() => handleSelect(c)}
                  accessibilityRole="button"
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        width: ICON_WRAPPER_SIZE,
                        height: ICON_WRAPPER_SIZE,
                        borderRadius: ICON_WRAPPER_SIZE / 2,
                        marginBottom: moderateScale(8),
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      // Prefer `icon` provisto por la categoría (desde la BDD). Si no existe,
                      // usamos el mapa de respaldo por id. Finalmente fallback 'map-marker'.
                      name={(c as any).icon ?? (ICON_MAP[c.id] as any) ?? 'map-marker'}
                      size={moderateScale(30)}
                      color="#fff"
                    />
                  </View>
                  <Text
                    style={[styles.itemLabel, { fontSize: LABEL_SIZE }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    allowFontScaling={false}
                  >
                    {c.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 0,
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
    backgroundColor: '#0A4A90',
  },
  closeText: { color: '#fff', fontWeight: '700' },
  title: {
    color: '#fff',
    fontWeight: '700',
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  item: {
    width: '30%',
    marginHorizontal: '1.66%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
  },
  iconWrap: {
    backgroundColor: '#0A4A90',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  itemLabel: {
    color: '#fff',
    textAlign: 'center',
  },
});
