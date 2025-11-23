import { supabase } from '@/app/shared/lib/supabase';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar cómo se muestran las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  // Tipo para cambio de estado de denuncia
  type: 'report_status_change';
  reportId: string;
  newStatus: string;
  screen: string;
}

export interface AssignmentNotificationData {
  // Tipo para asignación de denuncia a inspector
  type: 'report_assigned';
  reportId: string;
  asignacionId?: number | string;
  screen: string;
}

/**
 * Registra el dispositivo para recibir notificaciones push
 * y guarda el token en la tabla tokens_push de Supabase
 */
export async function registerForPushNotifications(): Promise<string | null> {
  let token: string | null = null;

  if (!Device.isDevice) {
    if (__DEV__) console.log('Las notificaciones push solo funcionan en dispositivos físicos');
    return null;
  }

  try {
    // Verificar permisos actuales
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Si no tiene permisos, solicitarlos
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      if (__DEV__) console.log('No se otorgaron permisos para notificaciones');
      return null;
    }

    // Obtener el token de Expo Push
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.error('No se encontró el projectId de EAS');
      return null;
    }

  token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (__DEV__) console.log('✅ Token de notificación obtenido:', token);

    // Configurar canal de notificación para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('denuncias-updates', {
        name: 'Actualizaciones de Denuncias',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0A4A90',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    // Guardar token en Supabase
    if (token) {
      await saveTokenToSupabase(token);
    }

    return token;
  } catch (error) {
    console.error('❌ Error al registrar notificaciones:', error);
    return null;
  }
}

/**
 * Guarda el token de notificación en la tabla tokens_push
 */
async function saveTokenToSupabase(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      if (__DEV__) console.log('No hay usuario autenticado');
      return;
    }

    // Obtener un identificador único del dispositivo
    const deviceId = Constants.sessionId || Device.modelName || 'unknown-device';

    // Usar upsert para insertar o actualizar
    const { error } = await supabase
      .from('tokens_push')
      .upsert({
        usuario_id: user.id,
        device_id: deviceId,
        expo_token: token,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'usuario_id,device_id'
      });

    if (error) {
      console.error('❌ Error guardando token en Supabase:', error);
    } else {
      if (__DEV__) console.log('✅ Token guardado exitosamente en Supabase');
    }
  } catch (error) {
    console.error('❌ Error en saveTokenToSupabase:', error);
  }
}

/**
 * Elimina el token de notificación cuando el usuario cierra sesión
 */
export async function unregisterPushNotifications(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const deviceId = Constants.sessionId || Device.modelName || 'unknown-device';

    // Try to obtain the current Expo token for this device (preferred) and delete by token.
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenResult = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const expoToken = tokenResult?.data ?? null;

      if (user && expoToken) {
        // Delete any rows that match this exact expo_token for this user
        await supabase.from('tokens_push').delete().eq('usuario_id', user.id).eq('expo_token', expoToken);
        if (__DEV__) console.log('✅ Token eliminado de Supabase por expo_token');
        return;
      }
    } catch (tokErr) {
      // Ignore token retrieval errors and fall back to deviceId-based deletion below
      if (__DEV__) console.debug('No se pudo obtener expo token en unregister:', tokErr);
    }

    // Fallback: delete by usuario_id + device_id (older behavior). This may fail
    // if the stored device_id was different at registration time; keep both checks.
    if (user) {
      await supabase
        .from('tokens_push')
        .delete()
        .eq('usuario_id', user.id)
        .eq('device_id', deviceId);

      if (__DEV__) console.log('✅ Token eliminado de Supabase por device_id (fallback)');
    }
  } catch (error) {
    console.error('❌ Error al eliminar token:', error);
  }
}

/**
 * Envía una notificación push a un usuario específico cuando cambia el estado de una denuncia
 * Esta función se llama desde el panel de inspector cuando actualiza el estado
 */
export async function sendReportUpdateNotification(
  userId: string,
  reportId: string,
  reportTitle: string,
  newStatusId: number
): Promise<void> {
  try {
    // Obtener todos los tokens del usuario (puede tener múltiples dispositivos)
    const { data: tokens, error: tokensError } = await supabase
      .from('tokens_push')
      .select('expo_token')
      .eq('usuario_id', userId);

    if (tokensError || !tokens || tokens.length === 0) {
      if (__DEV__) console.log('Usuario no tiene tokens de notificación registrados');
      return;
    }

    // Obtener el nombre del estado
    const { data: estado } = await supabase
      .from('estados_denuncia')
      .select('nombre')
      .eq('id', newStatusId)
      .single();

    // Mapear estados a mensajes amigables
    const statusMessages: Record<string, string> = {
      'Pendiente': 'está pendiente de revisión',
      'En proceso': 'está siendo procesada',
      'Cerrada': 'ha sido cerrada'
    };

    const estadoNombre = estado?.nombre || 'desconocido';
    const statusMessage = statusMessages[estadoNombre] || 'ha cambiado de estado';

    // Preparar mensajes para todos los dispositivos del usuario
    const messages = tokens.map((token: { expo_token: string }) => ({
      to: token.expo_token,
      sound: 'default',
      title: '📢 Actualización de Denuncia',
      body: `Tu denuncia "${reportTitle}" ${statusMessage}`,
      data: {
        type: 'report_status_change',
        reportId: reportId,
        newStatus: estadoNombre,
        screen: 'reportDetail'
      },
      priority: 'high',
      channelId: 'denuncias-updates',
    }));

    // Enviar todas las notificaciones
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error enviando notificación:', errorText);
      return;
    }

    const result = await response.json();
  if (__DEV__) console.log('✅ Notificación enviada:', result);

    // Registrar en la tabla de notificaciones enviadas
    await supabase.from('notificaciones_enviadas').insert({
      usuario_id: userId,
      tipo: 'CAMBIO_ESTADO_DENUNCIA',
      payload: {
        reportId,
        newStatusId,
        title: reportTitle
      }
    });

  } catch (error) {
    console.error('❌ Error en sendReportUpdateNotification:', error);
  }
}

/**
 * Maneja la notificación recibida y navega a la pantalla correspondiente
 */
export function setupNotificationListeners(
  onNotificationReceived: (data: NotificationData | AssignmentNotificationData) => void
): () => void {
  // Listener para cuando llega una notificación y la app está en primer plano
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      const data = notification.request.content.data as unknown as
        | NotificationData
        | AssignmentNotificationData;
      if (__DEV__) console.log('📬 Notificación recibida:', data);

      // Manejar tanto cambio de estado como asignación
      if (data?.type === 'report_status_change' || data?.type === 'report_assigned') {
        onNotificationReceived(data as NotificationData | AssignmentNotificationData);
      }
    }
  );

  // Listener para cuando el usuario toca la notificación
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as unknown as
        | NotificationData
        | AssignmentNotificationData;
      if (__DEV__) console.log('👆 Usuario tocó la notificación:', data);

      if (data?.type === 'report_status_change' || data?.type === 'report_assigned') {
        onNotificationReceived(data as NotificationData | AssignmentNotificationData);
      }
    }
  );

  // Retornar función de limpieza
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Obtiene la última notificación que abrió la app (si existe)
 */
export async function getInitialNotification(): Promise<NotificationData | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  
  if (response) {
    const data = response.notification.request.content.data as unknown as
      | NotificationData
      | AssignmentNotificationData;
    if (data?.type === 'report_status_change') return data as NotificationData;
    if (data?.type === 'report_assigned') return null; // el handler que recibe assignment puede manejarlo por separado
    return null;
  }
  
  return null;
}
export default {
  setupNotificationListeners,
  getInitialNotification
};