


// app/features/profileInspector/components/TurnCardContainer.tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { getTurnoInspectorCompat as getTurnoInspector, InspectorTurnoResponse } from '../api/inspectorProfile.api';

interface TurnCardProps {
  shiftTitle: string;
  schedule: string;
  description: string;
  isActive: boolean;
  inspectorType: boolean;
  onPressDetail?: () => void;
  onCloseShift?: () => void;
}

const TurnCard: React.FC<TurnCardProps> = ({
  shiftTitle,
  schedule,
  description,
  isActive,
  inspectorType,
  onPressDetail,
  onCloseShift,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{shiftTitle}</Text>
      <Text style={styles.info}>Horario: {schedule}</Text>
      {description && <Text style={styles.info}>Descripción: {description}</Text>}
      <Text style={[styles.info, isActive ? styles.activeStatus : styles.inactiveStatus]}>
        Estado: {isActive ? 'Activo' : 'Inactivo'}
      </Text>
      <Text style={styles.info}>
        Tipo: {inspectorType ? 'Inspector' : 'Otro'}
      </Text>
    </View>
  );
};

interface TurnCardContainerProps {
  onPressDetail?: () => void;
  onCloseShift?: () => void;
}

function formatSchedule(horaInicio: string, horaTermino: string): string {
  if (!horaInicio || !horaTermino) return 'Horario no disponible';

  const start = horaInicio.slice(0, 5);
  const end = horaTermino.slice(0, 5);
  return `${start} - ${end}`;
}

const TurnCardContainer: React.FC<TurnCardContainerProps> = ({
  onPressDetail,
  onCloseShift,
}) => {
  const [turnoData, setTurnoData] = useState<InspectorTurnoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTurno = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getTurnoInspector();

        if (!isMounted) return;

        setTurnoData(data);
      } catch (err) {
        if (!isMounted) return;

        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        setTurnoData(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTurno();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <Text style={styles.infoText}>Cargando turno...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!turnoData || !turnoData.turno_data) {
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>
          No tienes un turno asignado.
        </Text>
      </View>
    );
  }

  const turno = turnoData.turno_data;
  const shiftTitle = turno.nombre || 'Turno asignado';
  const schedule = formatSchedule(turno.hora_inicio, turno.hora_termino);
  const description = turno.descripcion || '';
  const isActive = turno.activo;
  const inspectorType = turno.inspector;

  return (
    <TurnCard
      shiftTitle={shiftTitle}
      schedule={schedule}
      description={description}
      isActive={isActive}
      inspectorType={inspectorType}
      onPressDetail={onPressDetail}
      onCloseShift={onCloseShift}
    />
  );
};

export default TurnCardContainer;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
  },
  errorText: {
    fontSize: 14,
    color: '#FF0000',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  activeStatus: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  inactiveStatus: {
    color: '#F44336',
    fontWeight: '600',
  },
});
