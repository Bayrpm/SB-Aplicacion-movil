import { useAuth } from '@/app/features/auth';
import {
  AssignmentNotificationData,
  getInitialNotification,
  NotificationData,
  registerForPushNotifications,
  setupNotificationListeners,
} from '@/app/services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

/**
 * Hook personalizado para manejar notificaciones push en toda la aplicación
 * Se debe usar en el layout principal (_layout.tsx) para inicializar las notificaciones
 */
export function useNotifications() {
  const [notificationToken, setNotificationToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const auth = useAuth();
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const initializeNotifications = async () => {
      // Si no hay usuario autenticado, intentar eliminar token antiguo y limpiar estado
      if (!auth?.user) {
        try {
          const svc = await import('@/app/services/notificationService');
          if (svc && typeof svc.unregisterPushNotifications === 'function') {
            await svc.unregisterPushNotifications();
          }
        } catch (e) {
          // noop
        }
        setNotificationToken(null);
        // No registrar listeners cuando no hay sesión
        return;
      }
      // Verificar si el usuario ha activado las notificaciones
      const notificationsEnabled = await AsyncStorage.getItem('@notifications_enabled');
      
      // Si el usuario no ha configurado las notificaciones o las tiene activadas
      if (notificationsEnabled === null || notificationsEnabled === 'true') {
        // Registrar para notificaciones al montar
        const token = await registerForPushNotifications();
        setNotificationToken(token);
        
        // Si es la primera vez, guardar como activadas
        if (notificationsEnabled === null) {
          await AsyncStorage.setItem('@notifications_enabled', 'true');
        }
      } else {
        // Notificaciones desactivadas por el usuario (sin log de depuración)
      }

      // Verificar si la app se abrió desde una notificación
      const initialNotification = await getInitialNotification();
      if (initialNotification) {
        handleNotificationNavigation(initialNotification);
      }

      // Configurar listeners para notificaciones futuras
      // El handler ahora verifica el rol actual para evitar navegar a pantallas
      // de otro tipo de usuario (p.ej. ciudadano vs inspector).
      cleanup = setupNotificationListeners((data) => handleNotificationNavigation(data as any));
    };

    initializeNotifications();

    // Limpieza al desmontar
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  // Re-ejecutar la inicialización cada vez que cambie el usuario (login/logout)
  }, [auth?.user?.id]);

  /**
   * Maneja la navegación cuando se recibe o se toca una notificación
   */
  const handleNotificationNavigation = (data: NotificationData | AssignmentNotificationData) => {
    setNotification(data as NotificationData);

    // Si no hay usuario autenticado, no hacemos navegación
    if (!auth?.user) return;

    // Si la notificación incluye un destinatario explícito, solo actuar
    // si coincide con el usuario actualmente autenticado.
    const maybeDestinatario = (data as any)?.destinatario_user_id ?? (data as any)?.usuario_id ?? (data as any)?.to_user_id ?? null;
    if (maybeDestinatario && String(maybeDestinatario) !== String(auth.user.id)) return;

    // Si es asignación y soy inspector, abrir la vista de inspector
    if ((data as AssignmentNotificationData)?.type === 'report_assigned') {
      if (auth.isInspector) {
        const payload = data as AssignmentNotificationData;
        router.push({
          pathname: '/(tabs)/inspector/inspectorHome',
          params: { openReportId: payload.reportId }
        });
      }
      return;
    }

    // Si es cambio de estado, solo navegar para usuarios ciudadanos
    if ((data as NotificationData).type === 'report_status_change' && (data as NotificationData).reportId) {
      if (!auth.isInspector) {
        router.push({
          pathname: '/(tabs)/citizen/citizenProfile',
          params: { openReportId: (data as NotificationData).reportId }
        });
      }
    }
  };

  return {
    notificationToken,
    notification,
  };
}
