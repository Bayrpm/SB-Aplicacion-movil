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
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
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
  console.warn('[mapEstadoToCaseStatus] Estado no mapeado:', estado, '→ usando PENDIENTE');
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
    setMovilActivo,
    setDatosMovilActivo,
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
  const [maxFechaDerivacionVisto, setMaxFechaDerivacionVisto] = useState<string | null>(null);

  // === Modal de cierre exitoso ===
  const [showCloseSuccessModal, setShowCloseSuccessModal] = useState(false);
  const [closedFolio, setClosedFolio] = useState<string | null>(null);

  /**
   * Carga todas las derivaciones del inspector,
   * las ordena y detecta si hay una derivación "nueva"
   * (la más reciente y en estado pendiente).
   */
  const loadDerivaciones = useCallback(
    async (): Promise<DerivacionItem[]> => {
      console.log('[HomeScreen] Iniciando carga de derivaciones...');
      setLoadingCases(true);

      const result = await fetchInspectorDerivaciones();

      let ordenadas: DerivacionItem[] = [];

      if (result.ok) {
        console.log(
          '[HomeScreen] Derivaciones obtenidas:',
          result.items.length
        );

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

        console.log('[HomeScreen] Derivaciones ordenadas:', ordenadas.length);
        
        // Debug: Log del mapeo de estados
        ordenadas.forEach((c, idx) => {
          const mappedStatus = mapEstadoToCaseStatus(c.estadoNombre);
          console.log(`[UI] Caso ${idx + 1}: estadoNombre='${c.estadoNombre}' → status='${mappedStatus}'`);
        });
        
        setCases(ordenadas);

        // Detectar nueva derivación: la primera debe ser PENDIENTE y más reciente que la vista
        if (ordenadas.length > 0) {
          const primera = ordenadas[0];
          const estadoPrimera = mapEstadoToCaseStatus(primera.estadoNombre);
          if (estadoPrimera === 'PENDIENTE' && primera.fechaDerivacion) {
            if (!maxFechaDerivacionVisto || primera.fechaDerivacion > maxFechaDerivacionVisto) {
              console.log('[HomeScreen] Nueva derivación detectada:', primera.denunciaId);
              setNewDerivation(primera);
              setShowNewDerivationModal(true);
              setMaxFechaDerivacionVisto(primera.fechaDerivacion);
            }
          }
        }
      } else {
        console.log('[derivaciones][error]', result.type, result.message);
      }

      setLoadingCases(false);
      return ordenadas;
    }, [maxFechaDerivacionVisto]);

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
          console.log(
            '[derivacion][marcar_en_proceso][error]',
            r
          );
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
    console.log('[HomeScreen] showMovilModal:', showMovilModal);
  }, [showMovilModal]);

  // Debug: Log cuando cambian los estados del móvil
  React.useEffect(() => {
    console.log('[HomeScreen] Estados móvil:', {
      loadingMovil,
      movilActivo,
      datosMovilActivo: datosMovilActivo ? 'SI' : 'NO',
      mostrarCard: !loadingMovil && movilActivo && datosMovilActivo,
    });
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
      console.log('[HomeScreen] useFocusEffect - Pantalla enfocada');

      const checkTurnoStatus = async () => {
        console.log(
          '[HomeScreen] Verificando estado del turno...'
        );
        setLoadingTurno(true);
        const activo = await verificarTurnoActivo();
        console.log('[HomeScreen] Turno activo:', activo);
        if (isActive) {
          setTurnoActivo(activo);
          setLoadingTurno(false);
        }
      };

      checkTurnoStatus();
      loadDerivaciones();

      return () => {
        console.log('[HomeScreen] useFocusEffect - Cleanup');
        isActive = false;
      };
    }, [loadDerivaciones])
  );

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
                console.log(
                  '[HomeScreen] Abriendo modal de móvil en modo iniciar'
                );
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
                timeAgo={formatTimeAgo(item.fechaDerivacion)}
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
          console.log('Turno iniciado:', data);
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
          console.log(
            '[HomeScreen] Cerrando modal de móvil'
          );
          setShowMovilModal(false);
        }}
        onInicioExitoso={async (data) => {
          console.log('Móvil registrado:', data);

          setMovilActivo(true);
          setDatosMovilActivo({
            movil: data.movil,
            km_inicio: data.km_inicio,
          });

          setShowMovilModal(false);
          AppAlert.alert(
            'Éxito',
            `Móvil ${data.movil.patente} registrado correctamente`
          );
        }}
        onCierreExitoso={(data) => {
          console.log(
            'Móvil cerrado. Km recorridos:',
            data.km_recorridos
          );
          setShowMovilModal(false);
          setMovilActivo(false);
          setDatosMovilActivo(null);
          AppAlert.alert(
            'Éxito',
            `Móvil cerrado correctamente. Recorriste ${data.km_recorridos} km`
          );
        }}
      />

      {/* Modal de detalle de derivación */}
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
    backgroundColor: '#059669',
  },
  closeVehicleButton: {
    backgroundColor: '#dc2626',
  },
  vehicleCardContainer: {
    paddingHorizontal: 16,
  },
});
