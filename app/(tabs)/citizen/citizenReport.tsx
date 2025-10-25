import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CurrentLocationMap from '../../features/report/components/currentLocationMap';
import ReportForm from '../../features/report/components/ReportForm';
import ReportPickerModal from '../../features/report/components/reportPickerModal';

export default function CitizenReportScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  useEffect(() => {
      const navAny = navigation as any;
      const unsub = navAny.addListener?.('tabPress', (e: any) => {
      // Si la pantalla está enfocada al presionar la pestaña, abrimos el modal
      try {
          const isFocused = typeof navAny.isFocused === 'function' ? navAny.isFocused() : false;
        if (isFocused) {
          setShowPicker(true);
        }
      } catch (err) {
        // fallback: abrir modal
        setShowPicker(true);
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [navigation]);

  return (
    <>
      <CurrentLocationMap />
      <ReportPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        tabBarHeight={72 + (insets.bottom || 0)}
        onSelect={(cat) => {
          // Abrir formulario sobre el mapa
          setSelectedCategoryId(cat.id);
          setShowPicker(false);
        }}
      />

      {selectedCategoryId ? (
        <ReportForm
          categoryId={selectedCategoryId}
          onClose={() => setSelectedCategoryId(null)}
          onBack={() => { setSelectedCategoryId(null); setShowPicker(true); }}
        />
      ) : null}
    </>
  );
}
