import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type InspectorFilterOrderBy = 'fecha_desc' | 'fecha_asc' | null;

export interface InspectorFilterOptions {
  orderBy?: InspectorFilterOrderBy;
  categoryId?: number | null;
  estadoId?: number | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  currentFilters: InspectorFilterOptions;
  onApplyFilters: (f: InspectorFilterOptions) => void;
  categories: { id: number; nombre: string }[];
  estados: { id: number; nombre: string }[];
}

export default function FilterModal({ visible, onClose, currentFilters, onApplyFilters, categories, estados }: Props) {
  const insets = useSafeAreaInsets();
  const { fontSize } = useFontSize();
  const [orderBy, setOrderBy] = useState<InspectorFilterOrderBy>(currentFilters.orderBy ?? null);
  const [categoryId, setCategoryId] = useState<number | null>(currentFilters.categoryId ?? null);
  const [estadoId, setEstadoId] = useState<number | null>(currentFilters.estadoId ?? null);

  const bgColor = useThemeColor({ light: '#FFFFFF', dark: '#071229' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint');
  const borderColor = useThemeColor({}, 'icon') + '26';
  const mutedColor = useThemeColor({}, 'icon');

  const handleApply = () => {
    onApplyFilters({ orderBy, categoryId, estadoId });
    onClose();
  };

  const handleReset = () => {
    setOrderBy(null);
    setCategoryId(null);
    setEstadoId(null);
  };

  const getFontSizeValue = (fs: 'small'|'medium'|'large', base: number) => {
    switch (fs) { case 'small': return base * 0.85; case 'large': return base * 1.25; default: return base; }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor, fontSize: getFontSizeValue(fontSize, 20) }]}>Filtros</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}><IconSymbol name="close" size={24} color={mutedColor} /></TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Filtrar por estado (primero) */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>Filtrar por estado</Text>
              <TouchableOpacity style={[styles.option, { borderColor }, estadoId === null && { borderColor: accentColor, backgroundColor: accentColor }]} onPress={() => setEstadoId(null)}>
                <IconSymbol name={estadoId === null ? 'check-circle' : 'circle-outline'} size={20} color={estadoId === null ? '#FFFFFF' : mutedColor} />
                <Text style={[styles.optionText, { color: estadoId === null ? '#FFFFFF' : textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>Ninguno</Text>
              </TouchableOpacity>
              {estados.map((est) => (
                <TouchableOpacity key={est.id} style={[styles.option, { borderColor }, estadoId === est.id && { borderColor: accentColor, backgroundColor: accentColor }]} onPress={() => setEstadoId(est.id)}>
                  <IconSymbol name={estadoId === est.id ? 'check-circle' : 'circle-outline'} size={20} color={estadoId === est.id ? '#FFFFFF' : mutedColor} />
                  <Text style={[styles.optionText, { color: estadoId === est.id ? '#FFFFFF' : textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>{est.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Ordenar */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>Ordenar</Text>
              <TouchableOpacity style={[styles.option, { borderColor }, orderBy === null && { borderColor: accentColor, backgroundColor: accentColor }]} onPress={() => setOrderBy(null)}>
                <IconSymbol name={orderBy === null ? 'check-circle' : 'circle-outline'} size={20} color={orderBy === null ? '#FFFFFF' : mutedColor} />
                <Text style={[styles.optionText, { color: orderBy === null ? '#FFFFFF' : textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>Ninguno</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.option, { borderColor }, orderBy === 'fecha_desc' && { borderColor: accentColor, backgroundColor: accentColor }]} onPress={() => setOrderBy('fecha_desc')}>
                <IconSymbol name={orderBy === 'fecha_desc' ? 'check-circle' : 'circle-outline'} size={20} color={orderBy === 'fecha_desc' ? '#FFFFFF' : mutedColor} />
                <Text style={[styles.optionText, { color: orderBy === 'fecha_desc' ? '#FFFFFF' : textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>Más recientes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.option, { borderColor }, orderBy === 'fecha_asc' && { borderColor: accentColor, backgroundColor: accentColor }]} onPress={() => setOrderBy('fecha_asc')}>
                <IconSymbol name={orderBy === 'fecha_asc' ? 'check-circle' : 'circle-outline'} size={20} color={orderBy === 'fecha_asc' ? '#FFFFFF' : mutedColor} />
                <Text style={[styles.optionText, { color: orderBy === 'fecha_asc' ? '#FFFFFF' : textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>Más antiguas</Text>
              </TouchableOpacity>
            </View>

            {/* Filtrar por categoría */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>Filtrar por categoría</Text>
              <TouchableOpacity style={[styles.option, { borderColor }, categoryId === null && { borderColor: accentColor, backgroundColor: accentColor }]} onPress={() => setCategoryId(null)}>
                <IconSymbol name={categoryId === null ? 'check-circle' : 'circle-outline'} size={20} color={categoryId === null ? '#FFFFFF' : mutedColor} />
                <Text style={[styles.optionText, { color: categoryId === null ? '#FFFFFF' : textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>Todas</Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity key={cat.id} style={[styles.option, { borderColor }, categoryId === cat.id && { borderColor: accentColor, backgroundColor: accentColor }]} onPress={() => setCategoryId(cat.id)}>
                  <IconSymbol name={categoryId === cat.id ? 'check-circle' : 'circle-outline'} size={20} color={categoryId === cat.id ? '#FFFFFF' : mutedColor} />
                  <Text style={[styles.optionText, { color: categoryId === cat.id ? '#FFFFFF' : textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>{cat.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: borderColor, paddingBottom: 16 + insets.bottom, paddingTop: 16 }]}>
            <TouchableOpacity style={[styles.resetButton, { borderColor: mutedColor }]} onPress={handleReset}><Text style={[styles.resetButtonText, { color: textColor, fontSize: getFontSizeValue(fontSize, 15) }]}>Limpiar</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.applyButton, { backgroundColor: accentColor }]} onPress={handleApply}><Text style={[styles.applyButtonText, { color: '#FFFFFF', fontSize: getFontSizeValue(fontSize, 15) }]}>Aplicar</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } }, android: { elevation: 8 } }) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#00000010' },
  title: { fontSize: 20, fontWeight: '700' },
  closeButton: { padding: 4 },
  content: { paddingHorizontal: 20, paddingVertical: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, marginBottom: 8 },
  optionText: { fontSize: 15, fontWeight: '500', flex: 1 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 0, borderTopWidth: 1 },
  resetButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  resetButtonText: { fontSize: 15, fontWeight: '700' },
  applyButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  applyButtonText: { fontSize: 15, fontWeight: '700' },
});
