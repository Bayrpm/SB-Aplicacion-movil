// app/features/profileInspector/components/DerivationDetailModal.tsx
import {
  DerivacionItem,
  cerrarDerivacionConReporte,
  fetchDenunciaObservaciones,
  updateDenunciaObservacion,
} from '@/app/features/homeInspector/api/inspectorDerivations.api';
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { supabase } from '@/app/shared/lib/supabase';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface DerivationDetailModalProps {
  visible: boolean;
  derivacion: DerivacionItem | null;
  onClose: () => void;
  /**
   * Callback opcional para avisar al padre que el cierre fue exitoso.
   * Ideal para recargar la lista en inspectorHome.tsx
   */
  onClosedSuccessfully?: () => void;
}

export default function DerivationDetailModal({
  visible,
  derivacion,
  onClose,
  onClosedSuccessfully,
}: DerivationDetailModalProps) {
  const windowHeight = Dimensions.get('window').height;
  // estimate top/bottom system bars so modal doesn't cover them
  const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 20;
  const NAV_BAR_ESTIMATED = Platform.OS === 'android' ? 48 : 34;
  const modalMaxHeight = Math.max(200, windowHeight - STATUS_BAR_HEIGHT - NAV_BAR_ESTIMATED - 32);
  const scrollRef = React.useRef<ScrollView | null>(null);
  const inputRefs = React.useRef<Record<number, TextInput | null>>({});
  const footerRef = React.useRef<View | null>(null);
  const reporteInputRef = React.useRef<TextInput | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const KEYBOARD_MARGIN = 24; // small margin between input and keyboard (increased)
  const MIN_CONTENT_BOTTOM = 72; // minimum bottom spacing inside modal content
  const FOOTER_SPACE = 160; // reserved space so last item isn't hidden by footer
  const prevScrollOffsetRef = React.useRef<number>(0);
  const isAutoScrollingRef = React.useRef<boolean>(false);
  const lastAutoScrollAtRef = React.useRef<number>(0);

  const [editingObsId, setEditingObsId] = useState<number | null>(null);
  const [editingObsContent, setEditingObsContent] = useState<string>('');
  const [editingLoading, setEditingLoading] = useState(false);

  React.useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates ? e.endCoordinates.height : 0);
      // remember offset before keyboard opened so we can restore later
      prevScrollOffsetRef.current = scrollOffset;
      // if editing an observation, scroll to it
      if (editingObsId) {
        // delay slightly to let layout settle
        setTimeout(() => scrollToFocusedInput(editingObsId), 50);
        return;
      }

      // If we just entered closing mode (Finalizar caso) and the reporte input exists,
      // measure it and scroll to make it visible. This avoids calling scrollToEnd
      // which can cause a large jump.
      if (isClosingMode && reporteInputRef.current && scrollRef.current) {
        setTimeout(() => {
          try {
            reporteInputRef.current?.measureInWindow((x, y, w, h) => {
              const inputBottom = y + h;
              const windowH = Dimensions.get('window').height;
              const visibleBottom = windowH - (e.endCoordinates ? e.endCoordinates.height : 0);
              const overlap = inputBottom - visibleBottom;
              if (overlap > -KEYBOARD_MARGIN) {
                const toScroll = Math.max(0, scrollOffset + overlap + KEYBOARD_MARGIN + 8);
                // animate a small scroll to avoid a huge jump
                scrollRef.current?.scrollTo({ y: toScroll, animated: true });
              }
            });
          } catch (err) {
            // ignore
          }
        }, 60);
      }
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      // Clear keyboard height and reset auto-scroll flags
      setKeyboardHeight(0);
      prevScrollOffsetRef.current = 0;
      isAutoScrollingRef.current = false;
      lastAutoScrollAtRef.current = 0;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [editingObsId]);

  // When editingObsId changes and keyboard is already visible, attempt to scroll
  useEffect(() => {
    if (editingObsId && keyboardHeight > 0) {
      setTimeout(() => scrollToFocusedInput(editingObsId), 60);
    }
  }, [editingObsId, keyboardHeight]);

  const scrollToFocusedInput = (obsId?: number | null) => {
    if (!obsId) return;
    // only scroll when keyboard is visible to avoid layout/scroll loops
    if (keyboardHeight <= 0) return;
    // prevent repeated auto-scrolls in a short time window
    const now = Date.now();
    if (isAutoScrollingRef.current && now - lastAutoScrollAtRef.current < 400) return;
    const ref = inputRefs.current[obsId];
    if (!ref || !scrollRef.current) return;

    try {
      // measure position on screen
      ref.measureInWindow((x, y, width, height) => {
        const inputBottom = y + height;
        const visibleAreaTop = 0;
        const visibleAreaBottom = windowHeight - keyboardHeight;
        const overlap = inputBottom - visibleAreaBottom;
        if (overlap > -KEYBOARD_MARGIN) {
          // only scroll if overlap is meaningful to avoid tiny adjustments
          if (overlap > -KEYBOARD_MARGIN && overlap > 8) {
            // need to scroll down by overlap + margin
            const toScroll = Math.max(0, scrollOffset + overlap + KEYBOARD_MARGIN + 8);
            try {
              isAutoScrollingRef.current = true;
              lastAutoScrollAtRef.current = Date.now();
              // use non-animated scroll to avoid layout-animation loops
              scrollRef.current?.scrollTo({ y: toScroll, animated: false });
            } finally {
              // release after a short delay
              setTimeout(() => {
                isAutoScrollingRef.current = false;
              }, 350);
            }
          }
        }
      });
    } catch (e) {
      // ignore measurement errors
    }
  };
  const [isClosing, setIsClosing] = useState(false);
  const [isClosingMode, setIsClosingMode] = useState(false);
  const [reporte, setReporte] = useState('');
  const contentBottomPadding = Math.max(MIN_CONTENT_BOTTOM, keyboardHeight + KEYBOARD_MARGIN + 16) + FOOTER_SPACE;
  const [observations, setObservations] = useState<any[]>([]);
  const [loadingObs, setLoadingObs] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { fontSize } = useFontSize();
  const bgColor = useThemeColor({ light: '#FFFFFF', dark: '#071229' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'icon');
  const tintColor = useThemeColor({ light: '#2563eb', dark: '#2563eb' }, 'tint');

  const getFontSizeValue = (size: 'small' | 'medium' | 'large', base: number) => {
    switch (size) {
      case 'small':
        return base * 0.85;
      case 'medium':
        return base;
      case 'large':
        return base * 1.25;
      default:
        return base;
    }
  };
  

  if (!derivacion) {
    return null;
  }

  const handleStartClosing = () => {
    setIsClosingMode(true);
    // Esperar a que el layout inserte la sección de cierre, enfocar el input
    // y luego medir el footer para desplazar exactamente y asegurar visibilidad.
    setTimeout(() => {
      try {
        // focus al input del reporte (si está disponible)
        reporteInputRef.current?.focus();
      } catch (e) {
        // ignore
      }

      // Después de que el teclado haya aparecido (si aplica) y el layout se estabilice,
      // medir la posición del footer y desplazar la ScrollView para mostrarlo.
      setTimeout(() => {
        try {
          if (footerRef.current && scrollRef.current) {
            footerRef.current.measureInWindow((fx, fy, fw, fh) => {
              const footerBottom = fy + fh;
              const visibleBottom = windowHeight - keyboardHeight;
              const overlap = footerBottom - visibleBottom;
              if (overlap > -KEYBOARD_MARGIN) {
                const toScroll = Math.max(0, scrollOffset + overlap + KEYBOARD_MARGIN + 8);
                scrollRef.current?.scrollTo({ y: toScroll, animated: true });
              } else {
                // si no hay solapamiento significativo, NO forzamos un scroll a fin
                // porque eso puede producir un salto grande. Dejar que el listener
                // del teclado haga el ajuste cuando el teclado esté realmente presente.
              }
            });
          }
        } catch (e) {
          // ignore
        }
      }, 220);
    }, 120);
  };

  const handleCancelClosing = () => {
    setIsClosingMode(false);
    setReporte('');
  };

  const handleConfirmClose = async () => {
    if (!reporte.trim()) {
      Alert.alert(
        'Reporte requerido',
        'Debes escribir un reporte para cerrar el caso.'
      );
      return;
    }

    try {
      setIsClosing(true);

      const result = await cerrarDerivacionConReporte({
        asignacionId: derivacion.asignacionId,
        denunciaId: derivacion.denunciaId,
        reporte: reporte.trim(),
      });

      if (!result.ok) {
Alert.alert(
          'Error al cerrar',
          result.message || 'Ocurrió un error al cerrar la derivación.'
        );
        return;
      }

      // Éxito
      setIsClosingMode(false);
      setReporte('');
      onClose();
      onClosedSuccessfully?.();
    } finally {
      setIsClosing(false);
    }
  };

  // Usamos el estado de la denuncia (estadoNombre)
  const estadoNombre = derivacion.estadoNombre;
  const estadoLabel =
    estadoNombre === 'PENDIENTE'
      ? 'Pendiente'
      : estadoNombre === 'EN_PROCESO'
      ? 'En proceso'
      : estadoNombre === 'CERRADA'
      ? 'Cerrada'
      : 'Desconocido';

  // Configuración de colores para badge de estado
  const STATUS_BADGE: Record<string, { bgColor: string; textColor: string }> = {
    PENDIENTE: { bgColor: '#FFEFD5', textColor: '#C27A00' },
    EN_PROCESO: { bgColor: '#FFF4CC', textColor: '#B58900' },
    CERRADA: { bgColor: '#E6F9EE', textColor: '#1C7C3C' },
    DESCONOCIDO: { bgColor: '#EEEEEE', textColor: '#666666' },
  };
  const badgeCfg = STATUS_BADGE[estadoNombre] || STATUS_BADGE.DESCONOCIDO;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDate = (d?: string | null) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
  };
  const formatTime = (d?: string | null) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };
  const fechaDerivacionFecha = formatDate(derivacion.fechaDerivacion);
  const fechaDerivacionHora = formatTime(derivacion.fechaDerivacion);

  // Obtener usuario actual para permisos de edición (se ejecuta al montar)
  useEffect(() => {
    let mounted = true;
    const getCurrentUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (mounted) setCurrentUserId(data?.user?.id ?? null);
      } catch (err) {
}
    };
    getCurrentUser();
    return () => {
      mounted = false;
    };
  }, []);

  // Cargar observaciones asociadas a la denuncia (se ejecuta cuando cambia la denuncia o visibility)
  useEffect(() => {
    let mounted = true;
    const loadObservations = async () => {
      if (!visible || !derivacion?.denunciaId) {
        setObservations([]);
        return;
      }

      try {
        setLoadingObs(true);
        const res = await fetchDenunciaObservaciones(derivacion.denunciaId);
        if (!mounted) return;
        if (res.ok) {
          setObservations(res.items || []);
        } else {
setObservations([]);
        }
      } catch (err) {
if (mounted) setObservations([]);
      } finally {
        if (mounted) setLoadingObs(false);
      }
    };

    loadObservations();

    return () => {
      mounted = false;
    };
  }, [visible, derivacion?.denunciaId]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        if (!isClosing) {
          onClose();
        }
      }}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalContainer, { maxHeight: modalMaxHeight, backgroundColor: bgColor }]}>
            <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <IconSymbol
                name="assignment"
                size={22}
                style={styles.headerIcon}
                color={tintColor}
              />
              <Text style={[styles.headerTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                {derivacion.titulo || 'Detalle de denuncia'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              disabled={isClosing}
              style={styles.closeButton}
            >
              <IconSymbol name="close" size={20} color={mutedColor} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
          >
            <ScrollView
              ref={(r) => { scrollRef.current = r; }}
              style={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onScroll={(e) => setScrollOffset(e.nativeEvent.contentOffset.y)}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingBottom: contentBottomPadding }}
            >
            {/* Folio y estado */}
            <View style={[styles.row, styles.rowInline]}>
              <Text style={[styles.label, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>Folio</Text>
              <Text style={[styles.folioValue, { color: tintColor, fontSize: getFontSizeValue(fontSize, 16) }]}>{derivacion.folio || 'Sin folio'}</Text>
            </View>

            <View style={[styles.row, styles.rowInline]}>
              <Text style={[styles.label, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>Estado derivación</Text>
              <View style={[styles.badge, { backgroundColor: badgeCfg.bgColor }]}>
                <Text style={[styles.badgeText, { color: badgeCfg.textColor, fontSize: getFontSizeValue(fontSize, 12) }]}>{estadoLabel}</Text>
              </View>
            </View>

            {/* Si quieres, podrías mostrar también el estado bruto de la denuncia */}
            {/* 
            <View style={styles.row}>
              <Text style={styles.label}>Estado denuncia (BD)</Text>
              <Text style={styles.value}>{derivacion.estadoNombre}</Text>
            </View>
            */}

            <View style={styles.row}>
              <Text style={[styles.label, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>Derivada el</Text>
              <Text style={[styles.value, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>Fecha: {fechaDerivacionFecha}  Hora: {fechaDerivacionHora}</Text>
            </View>

            {/* Fechas de atención */}
            {derivacion.fechaInicioAtencion && (
              <View style={styles.row}>
                <Text style={[styles.label, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>Inicio atención</Text>
                <Text style={[styles.value, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>Fecha: {formatDate(derivacion.fechaInicioAtencion)}  Hora: {formatTime(derivacion.fechaInicioAtencion)}</Text>
              </View>
            )}

            {derivacion.fechaTermino && (
              <View style={styles.row}>
                <Text style={[styles.label, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>Término atención</Text>
                <Text style={[styles.value, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>Fecha: {formatDate(derivacion.fechaTermino)}  Hora: {formatTime(derivacion.fechaTermino)}</Text>
              </View>
            )}

            {derivacion.descripcion && (
              <View style={styles.row}>
                <Text style={[styles.label, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>Descripción</Text>
                <Text style={[styles.value, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>{derivacion.descripcion}</Text>
              </View>
            )}

            {derivacion.ubicacionTexto && (
              <View style={styles.row}>
                <Text style={[styles.label, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>Dirección</Text>
                <Text style={[styles.value, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>{derivacion.ubicacionTexto}</Text>
              </View>
            )}

            {/* Observaciones asociadas a la denuncia */}
            <View style={styles.row}>
              <Text style={[styles.label, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>Observaciones</Text>
              {loadingObs ? (
                <Text style={[styles.value, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>Cargando...</Text>
              ) : observations.length === 0 ? (
                <Text style={[styles.value, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>Sin observaciones</Text>
              ) : (
                observations.map((o) => (
                  <View key={o.id} style={styles.obsItem}>
                    <View style={styles.obsRow}>
                      <View style={styles.obsInfo}>
                        <View style={styles.obsHeader}>
                          <Text style={[styles.obsTipo, { color: '#444', fontSize: getFontSizeValue(fontSize, 12) }]}>{o.tipo === 'TERRENO' ? 'Inspector' : o.tipo}</Text>
                          <Text style={[styles.obsDate, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 11) }]}>{formatDate(o.created_at)} {formatTime(o.created_at)}</Text>
                        </View>

                        {editingObsId === o.id ? (
                          <View>
                            <TextInput
                              ref={(r) => {
                                if (r) inputRefs.current[o.id] = r;
                                else delete inputRefs.current[o.id];
                              }}
                              style={[styles.editInput, { backgroundColor: bgColor, color: textColor, fontSize: getFontSizeValue(fontSize, 13) }]}
                              value={editingObsContent}
                              onChangeText={setEditingObsContent}
                              multiline
                              editable={!editingLoading}
                              onFocus={() => {
                                // small delay; scroll will only run when keyboardHeight > 0
                                setTimeout(() => scrollToFocusedInput(o.id), 60);
                              }}
                              onLayout={() => {
                                // only attempt to scroll if keyboard is visible and this is the editing input
                                if (editingObsId === o.id && keyboardHeight > 0) {
                                  setTimeout(() => scrollToFocusedInput(o.id), 60);
                                }
                              }}
                            />
                            <View style={styles.editButtons} accessibilityRole="toolbar">
                              <TouchableOpacity
                                style={styles.smallButtonSecondary}
                                onPress={() => {
                                  setEditingObsId(null);
                                  setEditingObsContent('');
                                }}
                                disabled={editingLoading}
                                accessibilityRole="button"
                              >
                                <Text style={[styles.smallButtonSecondaryText, { color: tintColor, fontSize: getFontSizeValue(fontSize, 14) }]}>Cancelar</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.smallButtonPrimary}
                                onPress={async () => {
                                  if (!editingObsId) return;
                                  try {
                                    setEditingLoading(true);
                                    const res = await updateDenunciaObservacion(
                                      editingObsId,
                                      editingObsContent
                                    );

                                    if (res.ok) {
                                      const data = res.item;
                                      setObservations((prev) => prev.map((it) => (it.id === data.id ? data : it)));
                                      setEditingObsId(null);
                                      setEditingObsContent('');
                                    } else {
                                      // Si la observación ya no existe, refrescamos la lista desde el servidor
                                      if (res.type === 'NOT_FOUND') {
                                        Alert.alert('Aviso', 'La observación no existe o ya fue eliminada.');
                                        try {
                                          setLoadingObs(true);
                                          const fres = await fetchDenunciaObservaciones(derivacion.denunciaId);
                                          if (fres.ok) {
                                            setObservations(fres.items || []);
                                          } else {
                                            setObservations((prev) => prev.filter((it) => it.id !== editingObsId));
                                          }
                                        } catch (e) {
                                          setObservations((prev) => prev.filter((it) => it.id !== editingObsId));
                                        } finally {
                                          setLoadingObs(false);
                                        }
                                      } else if (res.type === 'NOT_OWNER') {
                                        Alert.alert('Permisos', 'No tienes permisos para editar esta observación.');
                                      } else if (res.type === 'NO_AUTH') {
                                        Alert.alert('Autenticación', 'Usuario no autenticado.');
                                      } else {
                                        Alert.alert('Error', res.message || 'No fue posible actualizar la observación.');
                                      }

                                      // Mostrar detalle diagnóstico en modo desarrollo para ayudar al debugging
                                      try {
                                        // En desarrollo, escribir detalle en la terminal/console (Metro / logcat)
                                        if (typeof __DEV__ !== 'undefined' && __DEV__ && res.detalle) {
}
                                      } catch (e) {
                                        // ignorar errores de logging
                                      }
                                    }
                                  } catch (err) {
Alert.alert('Error', 'Ocurrió un error al actualizar la observación.');
                                  } finally {
                                    setEditingLoading(false);
                                  }
                                }}
                                disabled={editingLoading}
                                accessibilityRole="button"
                              >
                                {editingLoading ? (
                                  <ActivityIndicator color="#fff" />
                                ) : (
                                  <Text style={[styles.smallButtonPrimaryText, { fontSize: getFontSizeValue(fontSize, 14) }]}>Guardar</Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <Text style={[styles.obsContenido, { color: textColor, fontSize: getFontSizeValue(fontSize, 13) }]}>{o.contenido}</Text>
                        )}
                      </View>

                      <View style={styles.obsAction}>
                        {o.creado_por && currentUserId && o.creado_por === currentUserId && (
                          <TouchableOpacity
                            onPress={() => {
                              setEditingObsId(o.id);
                              setEditingObsContent(o.contenido || '');
                            }}
                            style={[styles.editActionBlue, { backgroundColor: tintColor }]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel={`Editar observación ${o.id}`}
                          >
                            <IconSymbol name="edit" size={18} color="#fff" />
                            <Text style={[styles.editActionText, { fontSize: getFontSizeValue(fontSize, 12) }]}>Editar</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

              {/* Zona de cierre: solo si la derivación NO está cerrada según estadoNombre */}
              {!isClosingMode && estadoNombre !== 'CERRADA' && (
                <View style={[styles.footer, { borderTopColor: mutedColor }] }>
                  <TouchableOpacity
                    style={[styles.finalizarButton, { backgroundColor: tintColor }]}
                    onPress={handleStartClosing}
                    disabled={isClosing}
                  >
                    <Text style={[styles.finalizarButtonText, { fontSize: getFontSizeValue(fontSize, 14) }]}>Finalizar caso</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isClosingMode && (
                <View style={[styles.footerClosing, { borderTopColor: mutedColor }]} ref={(r) => { footerRef.current = r; }}>
                  <Text style={[styles.reporteLabel, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>Reporte final</Text>
                  <TextInput
                    ref={(r) => { reporteInputRef.current = r; }}
                    style={[styles.reporteInput, { backgroundColor: bgColor, color: textColor, fontSize: getFontSizeValue(fontSize, 13) }]}
                    placeholder="Describe brevemente qué hiciste y el resultado..."
                    placeholderTextColor={mutedColor}
                    value={reporte}
                    onChangeText={setReporte}
                    editable={!isClosing}
                    multiline
                  />

                  <View style={styles.footerButtonsRow}>
                    <TouchableOpacity
                      style={[styles.cancelButton, { borderColor: mutedColor }]}
                      onPress={handleCancelClosing}
                      disabled={isClosing}
                    >
                      <Text style={[styles.cancelButtonText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 13) }]}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.confirmButton, { backgroundColor: tintColor }]}
                      onPress={handleConfirmClose}
                      disabled={isClosing}
                    >
                      {isClosing ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={[styles.confirmButtonText, { fontSize: getFontSizeValue(fontSize, 13) }]}>Confirmar cierre</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  editInput: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#fff',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8 as any,
    marginTop: 8,
  },
  smallButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2563EB',
    marginRight: 8,
  },
  smallButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  smallButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  smallButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  
  
  row: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: '#222',
  },
  rowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  folioValue: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '700',
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  obsItem: {
    marginTop: 8,
    backgroundColor: '#FBFBFD',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0F0F3',
    overflow: 'hidden',
  },
  obsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  obsLeft: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  obsRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  editIconButton: {
    minWidth: 34,
    minHeight: 34,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  obsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8 as any,
  },
  editIconInline: {
    marginLeft: 8,
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  obsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  obsInfo: {
    flex: 0.7,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    // ensure left corners remain rounded
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  obsAction: {
    flex: 0.3,
    backgroundColor: '#1C64F2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
    paddingHorizontal: 6,
    // only round right corners so the blue area fills to the edge
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  editActionBlue: {
    width: 56,
    minHeight: 64,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  editActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  obsTipo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#444',
  },
  obsDate: {
    fontSize: 11,
    color: '#666',
    marginLeft: 8,
  },
  obsContenido: {
    fontSize: 13,
    color: '#222',
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  finalizarButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  finalizarButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footerClosing: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  reporteLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#444',
    marginBottom: 4,
  },
  reporteInput: {
    minHeight: 80,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  footerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8 as any,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#888',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 13,
    color: '#444',
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
