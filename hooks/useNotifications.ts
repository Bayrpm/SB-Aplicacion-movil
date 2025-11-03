import {
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

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const initializeNotifications = async () => {
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
        console.log('ℹ️ Notificaciones desactivadas por el usuario');
      }

      // Verificar si la app se abrió desde una notificación
      const initialNotification = await getInitialNotification();
      if (initialNotification) {
        handleNotificationNavigation(initialNotification);
      }

      // Configurar listeners para notificaciones futuras
      cleanup = setupNotificationListeners(handleNotificationNavigation);
    };

    initializeNotifications();

    // Limpieza al desmontar
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  /**
   * Maneja la navegación cuando se recibe o se toca una notificación
   */
  const handleNotificationNavigation = (data: NotificationData) => {
    setNotification(data);
    
    if (data.type === 'report_status_change' && data.reportId) {
      console.log('🔔 Navegando al reporte:', data.reportId);
      
      // Navegar al perfil del ciudadano con el parámetro openReportId
      // El componente citizenProfile detectará este parámetro y abrirá el modal automáticamente
      router.push({
        pathname: '/(tabs)/citizen/citizenProfile',
        params: { openReportId: data.reportId }
      });
    }
  };

  return {
    notificationToken,
    notification,
  };
}
