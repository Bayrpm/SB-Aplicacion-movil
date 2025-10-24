import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CurrentLocationMap from '../../features/report/components/currentLocationMap';
import ReportPickerModal from '../../features/report/components/reportPickerModal';

export default function CitizenReportScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [showPicker, setShowPicker] = useState(false);

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
      <ReportPickerModal visible={showPicker} onClose={() => setShowPicker(false)} tabBarHeight={72 + (insets.bottom || 0)} />
    </>
  );
}
