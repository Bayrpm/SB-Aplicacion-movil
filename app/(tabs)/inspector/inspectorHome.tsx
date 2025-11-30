// app/features/homeInspector/inspectorHome.tsx
import {
  DerivacionEstadoNombre,
  DerivacionItem,
  fetchInspectorDerivaciones,
  marcarDerivacionEnProceso,
} from '@/app/features/homeInspector/api/inspectorDerivations.api';
import CloseDerivationModal from '@/app/features/homeInspector/components/closeDerivationModal';
import DerivationDetailModal from '@/app/features/homeInspector/components/derivationDetailModal';
import MyCases, { CaseStatus } from '@/app/features/homeInspector/components/myCasesComponent';
import NewDerivationModal from '@/app/features/homeInspector/components/NewDerivationModal';

import {
  registrarSalidaTurnoActual,
  verificarTurnoActivo,
} from '@/app/features/profileInspector/api/turnInspector.api';
import { ModalMovilInspector } from '@/app/features/profileInspector/components/modalMovilInspector';
import { ModalTurnInspector } from '@/app/features/profileInspector/components/modalTurnInspector';
import { VehicleCard } from '@/app/features/profileInspector/components/vehicleCardComponent';
import { useMovil } from '@/app/features/profileInspector/context/movilContext';
import { supabase } from '@/app/shared/lib/supabase';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Formato rápido de fecha/hora (por ahora lo usamos como "fecha derivación")
function formatTimeAgo(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-CL');
}

/**
 * Mapea el estado de la denuncia (DerivacionEstadoNombre) al tipo CaseStatus usado en la UI.
 * Mapeo EXACTO uno-a-uno:
 * - 'PENDIENTE' → 'PENDIENTE'
 * - 'EN_PROCESO' → 'EN_PROCESO'
 * - 'CERRADA' → 'CERRADA'
 * - 'DESCONOCIDO' → 'PENDIENTE' (fallback)
 */
function mapEstadoToCaseStatus(estado: DerivacionEstadoNombre): CaseStatus {
  // Mapeo directo: tipos son idénticos excepto DESCONOCIDO
  if (estado === 'PENDIENTE') return 'PENDIENTE';
  if (estado === 'EN_PROCESO') return 'EN_PROCESO';
  if (estado === 'CERRADA') return 'CERRADA';

  // Fallback para DESCONOCIDO u otros valores
  return 'PENDIENTE';
}

export default function HomeScreen() {
  const [showTurnModal, setShowTurnModal] = React.useState(false);
  const [turnoActivo, setTurnoActivo] = React.useState(false);
  const [loadingTurno, setLoadingTurno] = React.useState(true);

  const [showMovilModal, setShowMovilModal] = React.useState(false);

  // Contexto global del móvil
  const {
    movilActivo,
    datosMovilActivo,
    loadingMovil,
    recargarMovilActivo,
  } = useMovil();

  const insets = useSafeAreaInsets();

  // === Derivaciones: listado + selección actual ===
  const [cases, setCases] = useState<DerivacionItem[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [selectedDerivation, setSelectedDerivation] =
    useState<DerivacionItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // === Modal de nueva derivación ===
  const [newDerivation, setNewDerivation] = useState<DerivacionItem | null>(null);
  const [showNewDerivationModal, setShowNewDerivationModal] = useState(false);
  const maxFechaDerivacionVistoRef = React.useRef<string | null>(null);

  // Debug: Log cuando cambian los estados del modal de nueva derivación
  React.useEffect(() => {
  }, [showNewDerivationModal, newDerivation]);

  // === Modal de cierre exitoso ===
  const [showCloseSuccessModal, setShowCloseSuccessModal] = useState(false);
  const [closedFolio, setClosedFolio] = useState<string | null>(null);

  /**
   * Carga todas las derivaciones del inspector,
   * las ordena y detecta si hay una derivación "nueva"
   * (la más reciente y en estado EN_PROCESO).
   * @param forzarModalNueva - Si es true, siempre muestra el modal de la derivación EN_PROCESO más reciente
   */
  const loadDerivaciones = useCallback(
    async (forzarModalNueva = false): Promise<DerivacionItem[]> => {
      setLoadingCases(true);

      const result = await fetchInspectorDerivaciones();

      let ordenadas: DerivacionItem[] = [];

      if (result.ok) {

        // Orden:
        // 1) EN_PROCESO
        // 2) PENDIENTE
        // 3) CERRADA
        // 4) cualquier otro
        const ordenEstado: Record<CaseStatus, number> = {
          EN_PROCESO: 0,
          PENDIENTE: 1,
          CERRADA: 2,
        };

        ordenadas = [...result.items].sort((a, b) => {
          const ea = ordenEstado[mapEstadoToCaseStatus(a.estadoNombre)] ?? 99;
          const eb = ordenEstado[mapEstadoToCaseStatus(b.estadoNombre)] ?? 99;
          if (ea !== eb) return ea - eb;

          // Si tienen el mismo “estado lógico”, ordenar por fecha de derivación (desc)
          return (
            new Date(b.fechaDerivacion).getTime() -
            new Date(a.fechaDerivacion).getTime()
          );
        });


        // Debug: Log del mapeo de estados
        ordenadas.forEach((c, idx) => {
          const mappedStatus = mapEstadoToCaseStatus(c.estadoNombre);
        });

        setCases(ordenadas);

        // Detectar nueva derivación: buscar la EN_PROCESO más reciente
        const derivacionesEnProceso = ordenadas.filter(
          (d) => mapEstadoToCaseStatus(d.estadoNombre) === 'EN_PROCESO'
        );


        if (derivacionesEnProceso.length > 0) {
          // Obtener la más reciente (ordenar por fecha descendente)
          const masReciente = derivacionesEnProceso.sort(
            (a, b) =>
              new Date(b.fechaDerivacion).getTime() -
              new Date(a.fechaDerivacion).getTime()
          )[0];


          // Mostrar modal si:
          // 1. forzarModalNueva es true (viene de Realtime)
          // 2. O es una derivación nueva (fecha más reciente que la última vista)
          const esNueva =
            !maxFechaDerivacionVistoRef.current ||
            masReciente.fechaDerivacion > maxFechaDerivacionVistoRef.current;

          if (forzarModalNueva || esNueva) {
            setNewDerivation(masReciente);
            setShowNewDerivationModal(true);
            maxFechaDerivacionVistoRef.current = masReciente.fechaDerivacion;
          } else {
          }
        } else {
        }
      } else {
      }

      setLoadingCases(false);
      return ordenadas;
    }, []);

  /**
   * Al tocar un caso:
   * - si está PENDIENTE, lo marcamos como EN_PROCESO en la BD
   * - abrimos el modal de detalle
   */
  const handlePressCase = useCallback(
    async (item: DerivacionItem) => {
      let updated = item;
      const estadoActual = mapEstadoToCaseStatus(item.estadoNombre);

      if (estadoActual === 'PENDIENTE') {
        const r = await marcarDerivacionEnProceso({
          asignacionId: item.asignacionId,
          denunciaId: item.denunciaId,
        });

        if (!r.ok) {
          // aquí podrías usar un toast o Alert si quieres
        } else {
          // Actualizamos el estado en memoria para el modal
          const nowIso = new Date().toISOString();
          updated = {
            ...item,
            estadoNombre: 'EN_PROCESO',
            estadoId: 2,
            fechaInicioAtencion:
              item.fechaInicioAtencion ?? nowIso,
          };

          // Refrescamos la lista en segundo plano
          loadDerivaciones();
        }
      }

      setSelectedDerivation(updated);
      setDetailVisible(true);
    },
    [loadDerivaciones]
  );

  // Debug: Log cuando cambia el estado del modal de móvil
  React.useEffect(() => {
  }, [showMovilModal]);

  // Debug: Log cuando cambian los estados del móvil
  React.useEffect(() => {
  }, [loadingMovil, movilActivo, datosMovilActivo]);

  const scheme = useColorScheme() ?? 'light';
  const logoSource =
    scheme === 'dark'
      ? require('@/assets/images/img_logo_blanco.png')
      : require('@/assets/images/img_logo.png');

  const LOGO_HEIGHT = 120;
  const headerWrapperHeight =
    LOGO_HEIGHT +
    Math.max(24, Math.round(insets.top * 0.8)) +
    24;

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const checkTurnoStatus = async () => {
        setLoadingTurno(true);
        const activo = await verificarTurnoActivo();
        if (isActive) {
          setTurnoActivo(activo);
          setLoadingTurno(false);
        }
      };

      checkTurnoStatus();
      loadDerivaciones();

      return () => {
        isActive = false;
      };
    }, [loadDerivaciones])
  );

  // Ref para acceder a la última versión de loadDerivaciones sin dependencias
  const loadDerivacionesRef = React.useRef(loadDerivaciones);

  React.useEffect(() => {
    loadDerivacionesRef.current = loadDerivaciones;
  }, [loadDerivaciones]);

  // Suscripción Realtime para detectar nuevas derivaciones
  useEffect(() => {

    // Obtener el ID del inspector actual
    const setupRealtimeSubscription = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        return null;
      }

      const { data: inspector } = await supabase
        .from('inspectores')
        .select('id')
        .eq('usuario_id', authData.user.id)
        .single();

      if (!inspector) {
        return null;
      }


      // Crear canal de suscripción
      const channel = supabase
        .channel('derivaciones-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'asignaciones_inspector',
            filter: `inspector_id=eq.${inspector.id}`,
          },
          async (payload) => {
            try {

              // Esperar un momento para que la BD procese completamente
              await new Promise((resolve) => setTimeout(resolve, 1500));

              // Recargar derivaciones y FORZAR mostrar modal de nueva derivación
              await loadDerivacionesRef.current(true); // true = forzar modal
            } catch (error) {
              // No propagar el error para evitar que afecte la sesión
            }
          }
        )
        .subscribe((status) => {
        });

      return channel;
    };

    let channelPromise = setupRealtimeSubscription();

    // Cleanup: desuscribirse al desmontar
    return () => {
      channelPromise.then((channel) => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
    };
  }, []); // Sin dependencias, usa ref para acceder a loadDerivaciones

  const handleCerrarTurno = () => {
    AppAlert.alert('Cerrar turno', '¿Estás seguro que deseas cerrar el turno?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar turno',
        style: 'destructive',
        onPress: async () => {
          setLoadingTurno(true);
          const result = await registrarSalidaTurnoActual();

          if (!result.ok) {
            AppAlert.alert('Error', result.message);
            setLoadingTurno(false);
            return;
          }

          setTurnoActivo(false);
          setLoadingTurno(false);
          AppAlert.alert('Éxito', 'Turno cerrado correctamente');
        },
      },
    ]);
  };

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{
          light: '#ffffff',
          dark: '#000000ff',
        }}
        headerHeight={headerWrapperHeight}
        headerImage={
          <View
            style={{
              height: headerWrapperHeight,
              justifyContent: 'flex-start',
              alignItems: 'center',
              paddingTop: Math.max(
                48,
                Math.round(insets.top * 1.2)
              ),
              paddingBottom: 24,
            }}
          >
            <Image
              source={logoSource}
              style={[
                styles.logo,
                { height: LOGO_HEIGHT, marginTop: 12 },
              ]}
              contentFit="contain"
            />
          </View>
        }
      >
        {/* Botón de control de turno */}
        <View style={styles.turnButtonContainer}>
          {loadingTurno ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : turnoActivo ? (
            <TouchableOpacity
              style={[styles.turnButton, styles.endTurnButton]}
              activeOpacity={0.7}
              onPress={handleCerrarTurno}
            >
              <IconSymbol
                name="clock"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.turnButtonText}>
                Cerrar Turno
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.turnButton,
                styles.startTurnButton,
              ]}
              activeOpacity={0.7}
              onPress={() => setShowTurnModal(true)}
            >
              <IconSymbol
                name="clock"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.turnButtonText}>
                Iniciar Turno
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Botón Registrar/Cerrar Móvil */}
        <View style={styles.turnButtonContainer}>
          {loadingMovil ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : movilActivo ? (
            <TouchableOpacity
              style={[
                styles.turnButton,
                styles.closeVehicleButton,
              ]}
              activeOpacity={0.7}
              onPress={() => setShowMovilModal(true)}
            >
              <IconSymbol
                name="xmark.circle"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.turnButtonText}>
                Cerrar Móvil
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.turnButton,
                styles.registerVehicleButton,
              ]}
              activeOpacity={0.7}
              onPress={() => {
                setShowMovilModal(true);
              }}
            >
              <IconSymbol
                name="car"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.turnButtonText}>
                Registrar Móvil
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Card de móvil activo */}
        {!loadingMovil && movilActivo && datosMovilActivo && (
          <View style={styles.vehicleCardContainer}>
            <VehicleCard
              movil={datosMovilActivo.movil}
              km_inicio={datosMovilActivo.km_inicio}
            />
          </View>
        )}

        {/* Título Mis Casos */}
        <View style={styles.contenedor}>
          <Text style={styles.titulo}>Mis casos</Text>
        </View>

        {/* Mis Casos */}
        <View style={styles.container}>
          {loadingCases && (
            <Text style={styles.infoText}>
              Cargando casos...
            </Text>
          )}

          {!loadingCases && cases.length === 0 && (
            <Text style={styles.infoText}>
              No tienes casos asignados aún.
            </Text>
          )}

          {!loadingCases &&
            cases.map((item) => (
              <MyCases
                key={item.asignacionId}
                title={item.titulo ?? 'Sin título'}
                description={
                  item.descripcion ??
                  (item.folio
                    ? `Folio: ${item.folio}`
                    : 'Sin descripción')
                }
                // Pasamos la fecha exacta y activamos el modo inspector
                dateTime={item.fechaDerivacion}
                inspector={true}
                address={
                  item.ubicacionTexto ?? 'Sin dirección'
                }
                status={mapEstadoToCaseStatus(item.estadoNombre)}
                onPressDetail={() => handlePressCase(item)}
              />
            ))}
        </View>
      </ParallaxScrollView>

      {/* Modal de inicio de turno */}
      <ModalTurnInspector
        visible={showTurnModal}
        onClose={() => setShowTurnModal(false)}
        onIngresoExitoso={(data) => {
          setShowTurnModal(false);
          setTurnoActivo(true);
        }}
      />

      {/* Modal de registro/cierre de móvil */}
      <ModalMovilInspector
        visible={showMovilModal}
        modo={movilActivo ? 'cerrar' : 'iniciar'}
        movilActivo={datosMovilActivo || undefined}
        onClose={() => {
          setShowMovilModal(false);
        }}
        onInicioExitoso={async (data) => {

          setShowMovilModal(false);

          // Recargar el estado del móvil desde la BD para sincronizar y guardar en cache
          await recargarMovilActivo();

          AppAlert.alert(
            'Éxito',
            `Móvil ${data.movil.patente} registrado correctamente`
          );
        }}
        onCierreExitoso={async (data) => {
          setShowMovilModal(false);

          // Recargar el estado del móvil desde la BD para sincronizar
          await recargarMovilActivo();

          AppAlert.alert(
            'Éxito',
            `Móvil cerrado correctamente. Recorriste ${data.km_recorridos} km`
          );
        }}
      />

      {/* Modal de detalle de derivación (montar solo si hay derivación seleccionada) */}
      {detailVisible && selectedDerivation && (
        <DerivationDetailModal
          visible={detailVisible}
          derivacion={selectedDerivation}
          onClose={() => setDetailVisible(false)}
          onClosedSuccessfully={async () => {
            // Guardar el folio y mostrar modal de éxito
            setClosedFolio(selectedDerivation?.folio || null);
            setDetailVisible(false);
            setShowCloseSuccessModal(true);
            // Recargar derivaciones
            await loadDerivaciones();
          }}
        />
      )}

      {/* Modal de nueva derivación */}
      <NewDerivationModal
        visible={showNewDerivationModal && !!newDerivation}
        derivacion={newDerivation}
        onView={() => {
          setShowNewDerivationModal(false);
          if (newDerivation) {
            handlePressCase(newDerivation);
          }
        }}
        onDismiss={() => {
          setShowNewDerivationModal(false);
        }}
      />

      {/* Modal de cierre exitoso */}
      <CloseDerivationModal
        visible={showCloseSuccessModal}
        folio={closedFolio}
        onClose={() => {
          setShowCloseSuccessModal(false);
          setClosedFolio(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    width: '100%',
    marginTop: 20,
  },
  titulo: {
    fontSize: 24,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  logo: {
    width: 260,
    height: 120,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  container: {
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  turnButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  turnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startTurnButton: {
    backgroundColor: '#2563eb',
  },
  endTurnButton: {
    backgroundColor: '#dc2626',
  },
  turnButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  registerVehicleButton: {
    backgroundColor: '#2563eb',
  },
  closeVehicleButton: {
    backgroundColor: '#dc2626',
  },
  vehicleCardContainer: {
    paddingHorizontal: 16,
  },
});
