// app/features/profileInspector/components/modalTurnInspector.tsx
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    registrarIngresoTurnoActual,
    TurnoIngresoResult,
} from '../api/turnInspector.api';

interface ModalTurnInspectorProps {
  visible: boolean;
  onClose: () => void;
  onIngresoExitoso?: (data: { turnoId: number; ingresoReal: string }) => void;
}

interface ModalTurnInspectorState {
  now: Date;
  loading: boolean;
  errorMessage: string | null;
}

export class ModalTurnInspector extends React.Component<
  ModalTurnInspectorProps,
  ModalTurnInspectorState
> {
  private intervalId?: number;

  constructor(props: ModalTurnInspectorProps) {
    super(props);

    this.state = {
      now: new Date(),
      loading: false,
      errorMessage: null,
    };

    this.handleIngresar = this.handleIngresar.bind(this);
  }

  componentDidMount() {
    // Actualizar la hora cada segundo
    this.intervalId = setInterval(() => {
      this.setState({ now: new Date() });
    }, 1000);
  }

  componentWillUnmount() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async handleIngresar() {
    this.setState({ loading: true, errorMessage: null });

    console.log('[ModalTurnInspector] Ingresar pressed - llamando a registrarIngresoTurnoActual');
    const result: TurnoIngresoResult = await registrarIngresoTurnoActual();
    console.log('[ModalTurnInspector] registrarIngresoTurnoActual result:', result);

    if (!result.ok) {
      console.error('[ModalTurnInspector] Error al ingresar turno:', result.message);
      this.setState({
        loading: false,
        errorMessage: result.message,
      });
      return;
    }

    this.setState({ loading: false });

    if (this.props.onIngresoExitoso) {
      this.props.onIngresoExitoso({
        turnoId: result.turnoId,
        ingresoReal: result.ingresoReal,
      });
    }

    this.props.onClose();
  }

  render() {
    const { visible, onClose } = this.props;
    const { now, loading, errorMessage } = this.state;

    // Formato explícito solicitado: Fecha: dd/mm/yyyy  Hora: HH:MM (24h)
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateString = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const timeString = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <Text style={styles.title}>Ingreso de turno</Text>

            <Text style={styles.label}>Fecha</Text>
            <Text style={styles.time}>{dateString}</Text>

            <Text style={[styles.label, { marginTop: 8 }]}>Hora</Text>
            <Text style={styles.time}>{timeString}</Text>

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
                style={[styles.button, styles.primaryButton]}
                onPress={this.handleIngresar}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </Text>
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
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  time: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
});

export default ModalTurnInspector;