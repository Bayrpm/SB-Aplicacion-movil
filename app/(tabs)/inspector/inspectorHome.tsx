import MyCases from '@/app/features/homeInspector/components/myCasesComponent';
import { registrarSalidaTurnoActual, verificarTurnoActivo } from '@/app/features/profileInspector/api/turnInspector.api';
import { ModalMovilInspector } from '@/app/features/profileInspector/components/modalMovilInspector';
import { ModalTurnInspector } from '@/app/features/profileInspector/components/modalTurnInspector';
import { VehicleCard } from '@/app/features/profileInspector/components/vehicleCardComponent';
import { useMovil } from '@/app/features/profileInspector/context/movilContext';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from "expo-image";
import { useFocusEffect } from 'expo-router';
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ParallaxScrollView from '@/components/parallax-scroll-view';

export default function HomeScreen() {
  const [showTurnModal, setShowTurnModal] = React.useState(false);
  const [turnoActivo, setTurnoActivo] = React.useState(false);
  const [loadingTurno, setLoadingTurno] = React.useState(true);

  const [showMovilModal, setShowMovilModal] = React.useState(false);
  
  // Usar el contexto global del móvil
  const { movilActivo, datosMovilActivo, loadingMovil, setMovilActivo, setDatosMovilActivo } = useMovil();

  const insets = useSafeAreaInsets();
  
  // Debug: Log cuando cambia el estado del modal
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
  const scheme = useColorScheme() ?? "light";
  const logoSource =
    scheme === "dark"
      ? require("@/assets/images/img_logo_blanco.png")
      : require("@/assets/images/img_logo.png");

  const LOGO_HEIGHT = 120;
  const headerWrapperHeight =
    LOGO_HEIGHT + Math.max(24, Math.round(insets.top * 0.8)) + 24;

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

      // El móvil ya se carga desde el contexto, no necesitamos verificarlo aquí

      checkTurnoStatus();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const handleCerrarTurno = () => {
    AppAlert.alert(
      'Cerrar turno',
      '¿Estás seguro que deseas cerrar el turno?',
      [
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
      ]
    );
  };

  return ( //return de HomeScreen()
    <>
    <ParallaxScrollView
      // fondo pantalla principal
      headerBackgroundColor={{ light: '#ffffff', dark: '#000000ff' }}
      headerHeight={headerWrapperHeight}
      headerImage={
        <View
          style={{
            height: headerWrapperHeight,
            justifyContent: "flex-start",
            alignItems: "center",
            paddingTop: Math.max(48, Math.round(insets.top * 1.2)),
            paddingBottom: 24,
          }}
        >
          <Image
            source={logoSource}
            style={[styles.logo, { height: LOGO_HEIGHT, marginTop: 12 }]}
            contentFit="contain"
          />
        </View>
      } //cierre de header image

    > {/*cierre de  ParallaxScrollView */}
      
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
            <IconSymbol name="clock" size={24} color="#FFFFFF" />
            <Text style={styles.turnButtonText}>Cerrar Turno</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.turnButton, styles.startTurnButton]}
            activeOpacity={0.7}
            onPress={() => setShowTurnModal(true)}
          >
            <IconSymbol name="clock" size={24} color="#FFFFFF" />
            <Text style={styles.turnButtonText}>Iniciar Turno</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Botón Registrar/Cerrar Móvil */}
      <View style={styles.turnButtonContainer}>
        {loadingMovil ? (
          <ActivityIndicator size="small" color="#059669" />
        ) : movilActivo ? (
          <TouchableOpacity
            style={[styles.turnButton, styles.closeVehicleButton]}
            activeOpacity={0.7}
            onPress={() => setShowMovilModal(true)}
          >
            <IconSymbol name="xmark.circle" size={24} color="#FFFFFF" />
            <Text style={styles.turnButtonText}>Cerrar Móvil</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.turnButton, styles.registerVehicleButton]}
            activeOpacity={0.7}
            onPress={() => {
              console.log('[HomeScreen] Abriendo modal de móvil en modo iniciar');
              setShowMovilModal(true);
            }}
          >
            <IconSymbol name="car" size={24} color="#FFFFFF" />
            <Text style={styles.turnButtonText}>Registrar Móvil</Text>
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
      

      {/* Titulo Mis Casos */}
      <View style={styles.contenedor}>
        <Text style={styles.titulo} > Mis casos</Text>
      </View>

      {/* Mis Casos */}
      <View style={styles.container}>
        <MyCases
          title='Auto'
          description='dbabdbjaksbdkadcbkasbcjkasbcjkacskjbcasjkbcjkab10'
          timeAgo='hace media hora'
          address="calle color sur"
        />
      </View>

    </ParallaxScrollView>

    <ModalTurnInspector
      visible={showTurnModal}
      onClose={() => setShowTurnModal(false)}
      onIngresoExitoso={(data) => {
        console.log('Turno iniciado:', data);
        setShowTurnModal(false);
        setTurnoActivo(true);
      }}
    />

    <ModalMovilInspector
      visible={showMovilModal}
      modo={movilActivo ? 'cerrar' : 'iniciar'}
      movilActivo={datosMovilActivo || undefined}
      onClose={() => {
        console.log('[HomeScreen] Cerrando modal de móvil');
        setShowMovilModal(false);
      }}
      onInicioExitoso={async (data) => {
        console.log('Móvil registrado:', data);
        
        // Actualizar estado inmediatamente con los datos recibidos
        setMovilActivo(true);
        setDatosMovilActivo({
          movil: data.movil,
          km_inicio: data.km_inicio,
        });
        
        setShowMovilModal(false);
        AppAlert.alert('Éxito', `Móvil ${data.movil.patente} registrado correctamente`);
      }}
      onCierreExitoso={(data) => {
        console.log('Móvil cerrado. Km recorridos:', data.km_recorridos);
        setShowMovilModal(false);
        setMovilActivo(false);
        setDatosMovilActivo(null);
        AppAlert.alert('Éxito', `Móvil cerrado correctamente. Recorriste ${data.km_recorridos} km`);
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

  // propio
  logo: {
    width: 260,
    height: 120,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 12,
  },

  container: {
    gap: 8,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
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

