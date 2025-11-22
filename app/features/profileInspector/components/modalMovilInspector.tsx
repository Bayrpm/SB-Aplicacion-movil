// app/features/profileInspector/components/modalMovilInspector.tsx
import React from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    buscarMovilPorPatente,
    cerrarUsoMovil,
    iniciarUsoMovil,
    Movil,
} from '../api/dataMovil.api';

type ModoModal = 'iniciar' | 'cerrar';

interface ModalMovilInspectorProps {
  visible: boolean;
  modo: ModoModal;
  movilActivo?: {
    movil: Movil;
    km_inicio: number;
  };
  onClose: () => void;
  onInicioExitoso?: (data: { uso_id: number; movil: Movil; km_inicio: number }) => void;
  onCierreExitoso?: (data: { uso_id: number; km_recorridos: number }) => void;
}

interface ModalMovilInspectorState {
  // Modo iniciar
  patente: string;
  buscandoMovil: boolean;
  movilEncontrado: Movil | null;

  // Modo cerrar
  kilometrajeFin: string;

  // Estados comunes
  kilometrajeInicio: string;
  loading: boolean;
  errorMessage: string | null;
}

export class ModalMovilInspector extends React.Component<
  ModalMovilInspectorProps,
  ModalMovilInspectorState
> {
  constructor(props: ModalMovilInspectorProps) {
    super(props);

    this.state = {
      patente: '',
      buscandoMovil: false,
      movilEncontrado: null,
      kilometrajeInicio: '',
      kilometrajeFin: '',
      loading: false,
      errorMessage: null,
    };

    this.handleBuscarMovil = this.handleBuscarMovil.bind(this);
    this.handleIniciarUso = this.handleIniciarUso.bind(this);
    this.handleCerrarUso = this.handleCerrarUso.bind(this);
    this.resetForm = this.resetForm.bind(this);
  }

  componentDidUpdate(prevProps: ModalMovilInspectorProps) {
    // Reset al cerrar el modal
    if (prevProps.visible && !this.props.visible) {
      this.resetForm();
    }
  }

  resetForm() {
    this.setState({
      patente: '',
      buscandoMovil: false,
      movilEncontrado: null,
      kilometrajeInicio: '',
      kilometrajeFin: '',
      loading: false,
      errorMessage: null,
    });
  }

  async handleBuscarMovil() {
    const { patente } = this.state;

    if (!patente.trim()) {
      this.setState({ errorMessage: 'Debes ingresar una patente.' });
      return;
    }

    this.setState({ buscandoMovil: true, errorMessage: null });

    const result = await buscarMovilPorPatente(patente);

    if (!result.ok) {
      this.setState({
        buscandoMovil: false,
        errorMessage: result.message,
        movilEncontrado: null,
      });
      return;
    }

    this.setState({
      buscandoMovil: false,
      movilEncontrado: result.movil,
      kilometrajeInicio: result.movil.kilometraje_actual.toString(),
      errorMessage: null,
    });
  }

  async handleIniciarUso() {
    const { movilEncontrado, kilometrajeInicio } = this.state;

    if (!movilEncontrado) {
      this.setState({ errorMessage: 'Primero debes buscar un móvil.' });
      return;
    }

    const kmInicio = parseFloat(kilometrajeInicio);

    if (isNaN(kmInicio) || kmInicio < 0) {
      this.setState({ errorMessage: 'Ingresa un kilometraje válido.' });
      return;
    }

    this.setState({ loading: true, errorMessage: null });

    const result = await iniciarUsoMovil(movilEncontrado.patente, kmInicio);

    if (!result.ok) {
      this.setState({
        loading: false,
        errorMessage: result.message,
      });
      return;
    }

    this.setState({ loading: false });

    if (this.props.onInicioExitoso) {
      this.props.onInicioExitoso({
        uso_id: result.uso_id,
        movil: result.movil,
        km_inicio: result.km_inicio,
      });
    }

    this.props.onClose();
  }

  async handleCerrarUso() {
    const { kilometrajeFin } = this.state;

    const kmFin = parseFloat(kilometrajeFin);

    if (isNaN(kmFin) || kmFin < 0) {
      this.setState({ errorMessage: 'Ingresa un kilometraje válido.' });
      return;
    }

    this.setState({ loading: true, errorMessage: null });

    const result = await cerrarUsoMovil(kmFin);

    if (!result.ok) {
      this.setState({
        loading: false,
        errorMessage: result.message,
      });
      return;
    }

    this.setState({ loading: false });

    if (this.props.onCierreExitoso) {
      this.props.onCierreExitoso({
        uso_id: result.uso_id,
        km_recorridos: result.km_recorridos,
      });
    }

    this.props.onClose();
  }

  renderModoIniciar() {
    const { patente, buscandoMovil, movilEncontrado } =
      this.state;

    return (
      <>
        <Text style={styles.title}>Registrar Móvil</Text>

        {/* Input patente */}
        <Text style={styles.label}>Patente del móvil</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            placeholder="Ej: ABCD12"
            value={patente}
            onChangeText={(text) => this.setState({ patente: text.toUpperCase() })}
            autoCapitalize="characters"
            editable={!buscandoMovil && !movilEncontrado}
          />
          <TouchableOpacity
            style={[styles.button, styles.searchButton]}
            onPress={this.handleBuscarMovil}
            disabled={buscandoMovil || !!movilEncontrado}
          >
            {buscandoMovil ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Buscar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Mostrar datos del móvil encontrado */}
        {movilEncontrado && (
          <View style={styles.movilInfo}>
            <Text style={styles.movilInfoTitle}>Datos del móvil:</Text>
            <Text style={styles.movilInfoText}>
              <Text style={styles.bold}>Patente:</Text> {movilEncontrado.patente}
            </Text>
            <Text style={styles.movilInfoText}>
              <Text style={styles.bold}>Tipo:</Text>{' '}
              {typeof movilEncontrado.movil_tipo === 'object' && movilEncontrado.movil_tipo !== null && !Array.isArray(movilEncontrado.movil_tipo)
                ? movilEncontrado.movil_tipo.nombre
                : Array.isArray(movilEncontrado.movil_tipo) && movilEncontrado.movil_tipo.length > 0
                ? movilEncontrado.movil_tipo[0].nombre
                : 'N/A'}
            </Text>
            {movilEncontrado.marca && movilEncontrado.modelo && (
              <Text style={styles.movilInfoText}>
                <Text style={styles.bold}>Vehículo:</Text> {movilEncontrado.marca}{' '}
                {movilEncontrado.modelo} {movilEncontrado.anio ?? ''}
              </Text>
            )}
            <Text style={styles.movilInfoText}>
              <Text style={styles.bold}>Kilometraje actual:</Text>{' '}
              {movilEncontrado.kilometraje_actual.toLocaleString()} km
            </Text>
            <Text style={[styles.movilInfoText, { marginTop: 8, fontSize: 12, fontStyle: 'italic', color: '#6b7280' }]}>
              Este kilometraje se usará como kilometraje inicial del uso.
            </Text>
          </View>
        )}
      </>
    );
  }

  renderModoCerrar() {
    const { movilActivo } = this.props;
    const { kilometrajeFin } = this.state;

    if (!movilActivo) {
      return (
        <>
          <Text style={styles.title}>Cerrar Móvil</Text>
          <Text style={styles.errorText}>
            No hay información del móvil activo.
          </Text>
        </>
      );
    }

    const { movil, km_inicio } = movilActivo;
    const kmFinNum = parseFloat(kilometrajeFin);
    const kmRecorridos =
      !isNaN(kmFinNum) && kmFinNum >= km_inicio
        ? kmFinNum - km_inicio
        : 0;

    return (
      <>
        <Text style={styles.title}>Cerrar Móvil</Text>

        <View style={styles.movilInfo}>
          <Text style={styles.movilInfoTitle}>Datos del móvil:</Text>
          <Text style={styles.movilInfoText}>
            <Text style={styles.bold}>Patente:</Text> {movil.patente}
          </Text>
          <Text style={styles.movilInfoText}>
            <Text style={styles.bold}>Tipo:</Text>{' '}
            {typeof movil.movil_tipo === 'object' && movil.movil_tipo !== null && !Array.isArray(movil.movil_tipo)
              ? movil.movil_tipo.nombre
              : Array.isArray(movil.movil_tipo) && movil.movil_tipo.length > 0
              ? movil.movil_tipo[0].nombre
              : 'N/A'}
          </Text>
          {movil.marca && movil.modelo && (
            <Text style={styles.movilInfoText}>
              <Text style={styles.bold}>Vehículo:</Text> {movil.marca}{' '}
              {movil.modelo} {movil.anio ?? ''}
            </Text>
          )}
          <Text style={styles.movilInfoText}>
            <Text style={styles.bold}>Kilometraje inicial:</Text>{' '}
            {km_inicio.toLocaleString()} km
          </Text>

          {/* Input kilometraje fin */}
          <Text style={[styles.label, { marginTop: 16 }]}>
            Kilometraje actual
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 12550"
            value={kilometrajeFin}
            onChangeText={(text) => this.setState({ kilometrajeFin: text })}
            keyboardType="numeric"
          />

          {/* Cálculo de km recorridos */}
          {kmRecorridos > 0 && (
            <Text style={styles.kmRecorridosText}>
              Kilómetros recorridos: <Text style={styles.bold}>{kmRecorridos.toLocaleString()} km</Text>
            </Text>
          )}
        </View>
      </>
    );
  }

  render() {
    const { visible, modo, onClose } = this.props;
    const { loading, errorMessage, movilEncontrado } = this.state;

    const puedeAceptarIniciar = modo === 'iniciar' && !!movilEncontrado;
    const puedeAceptarCerrar = modo === 'cerrar';

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            {modo === 'iniciar' ? this.renderModoIniciar() : this.renderModoCerrar()}

            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  (!puedeAceptarIniciar && !puedeAceptarCerrar) &&
                    styles.buttonDisabled,
                ]}
                onPress={
                  modo === 'iniciar'
                    ? this.handleIniciarUso
                    : this.handleCerrarUso
                }
                disabled={
                  loading ||
                  (modo === 'iniciar' && !puedeAceptarIniciar) ||
                  (modo === 'cerrar' && !puedeAceptarCerrar)
                }
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Aceptar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111827',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  inputFlex: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  movilInfo: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  movilInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  movilInfoText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  bold: {
    fontWeight: '600',
  },
  kmRecorridosText: {
    marginTop: 12,
    fontSize: 16,
    color: '#059669',
    textAlign: 'center',
  },
  errorText: {
    color: '#dc2626',
    marginBottom: 12,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  searchButton: {
    backgroundColor: '#059669',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 15,
  },
});
