import ReportForm from "@/app/features/report/components/reportForm";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CurrentLocationMap from "../../features/report/components/currentLocationMap";
import ReportPickerModal from "../../features/report/components/reportPickerModal";
import {
  clearReportFormSnapshot,
  getReportFormSnapshot,
} from "../../features/report/types/reportFormBridge";

export default function CitizenReportScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [initialData, setInitialData] = useState<any | null>(null);

  // On mount, restore snapshot if present (coming back from editLocation)
  useEffect(() => {
    const snap = getReportFormSnapshot();
    if (snap && snap.categoryId) {
      clearReportFormSnapshot();
      setInitialData({
        titulo: snap.titulo,
        descripcion: snap.descripcion,
        anonimo: snap.anonimo,
        ubicacionTexto: snap.ubicacionTexto,
        coords: snap.coords,
      });
      setSelectedCategoryId(snap.categoryId);
    }
  }, []);

  // Also, whenever this screen receives focus, check for a snapshot in case
  // we navigated back here from editLocation using router.replace. The
  // previous implementation only checked on mount which misses the replace
  // case when the screen was already mounted.
  useEffect(() => {
    const navAny = navigation as any;
    const unsubFocus = navAny.addListener?.("focus", () => {
      const snap = getReportFormSnapshot();
      if (snap && snap.categoryId) {
        clearReportFormSnapshot();
        setInitialData({
          titulo: snap.titulo,
          descripcion: snap.descripcion,
          anonimo: snap.anonimo,
          ubicacionTexto: snap.ubicacionTexto,
          coords: snap.coords,
        });
        setSelectedCategoryId(snap.categoryId);
      }
    });
    return () => {
      if (typeof unsubFocus === "function") unsubFocus();
    };
  }, [navigation]);

  useEffect(() => {
    const navAny = navigation as any;
    const unsub = navAny.addListener?.("tabPress", (e: any) => {
      // Si la pantalla está enfocada al presionar la pestaña, abrimos el modal
      try {
        const isFocused =
          typeof navAny.isFocused === "function" ? navAny.isFocused() : false;
        if (isFocused) {
          setShowPicker(true);
        }
      } catch (err) {
        // fallback: abrir modal
        setShowPicker(true);
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
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
          initialData={initialData ?? undefined}
          onClose={() => {
            setSelectedCategoryId(null);
            setInitialData(null);
          }}
          onBack={() => {
            setSelectedCategoryId(null);
            setInitialData(null);
            setShowPicker(true);
          }}
        />
      ) : null}
    </>
  );
}
