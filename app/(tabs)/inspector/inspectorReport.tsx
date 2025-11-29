import { useAuth } from '@/app/features/auth/context';
import ReportsList from '@/app/features/profileCitizen/components/reportsList';
import ReportForm from '@/app/features/report/components/reportForm';
import ReportPickerModal from '@/app/features/report/components/reportPickerModal';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function InspectorNotificationScreen() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.container, { paddingTop: (insets.top || 0) + 12 }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.reportCard}
          onPress={() => setShowPicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Reportar nueva denuncia"
          activeOpacity={0.9}
        >
          <View style={styles.reportCardInner}>
            <IconSymbol name="plus" size={20} color="#fff" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.reportCardTitle}>Reportar</Text>
              <Text style={styles.reportCardSubtitle}>Crear una nueva denuncia</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.listWrap}>
        <ReportsList />
      </View>

      <ReportPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        tabBarHeight={72 + (insets.bottom || 0)}
        onSelect={(cat) => {
          setSelectedCategoryId(cat.id);
          setShowPicker(false);
          setShowReportModal(true);
        }}
      />

      {showReportModal && (
        <ReportForm categoryId={selectedCategoryId ?? undefined} onClose={() => setShowReportModal(false)} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  reportButton: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0A4A90',
    backgroundColor: 'transparent',
  },
  reportButtonText: {
    color: '#0A4A90',
    fontWeight: '700',
    marginLeft: 6,
  },
  reportCard: {
    width: '100%',
    backgroundColor: '#0A4A90',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  reportCardInner: { flexDirection: 'row', alignItems: 'center' },
  reportCardTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  reportCardSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  listWrap: {
    flex: 1,
  },
});

