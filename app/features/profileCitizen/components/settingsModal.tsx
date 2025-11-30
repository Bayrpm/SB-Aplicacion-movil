// app/features/profileCitizen/components/settingsModal.tsx
import CameraRequestModal from '@/app/features/profileCitizen/components/cameraRequestModal';
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { registerForPushNotifications, unregisterPushNotifications } from '@/app/services/notificationService';
import PrivacyModal from '@/components/privacyModal';
import TermsModal from '@/components/termsModal';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemeMode, useAppColorScheme } from '@/hooks/useAppColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

// Si `inspector` es true, mostramos solo las opciones permitidas para inspectores
interface SettingsModalPropsExtended extends SettingsModalProps {
  inspector?: boolean;
}


export default function SettingsModal({ visible, onClose, inspector = false }: SettingsModalPropsExtended) {
  const insets = useSafeAreaInsets();
  const [, setAppThemeMode] = useAppColorScheme();
  const bgColor = useThemeColor({ light: '#FFFFFF', dark: '#071229' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'icon');
  const accentColor = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint');
  const itemBg = useThemeColor({ light: '#F9FAFB', dark: '#0A1628' }, 'background');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F2937' }, 'icon');

  const { fontSize, setFontSize: setGlobalFontSize } = useFontSize();
  
  const [themeMode, setThemeMode] = React.useState<ThemeMode>('light');
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [showThemeSelector, setShowThemeSelector] = React.useState(false);
  const [showFontSizeSelector, setShowFontSizeSelector] = React.useState(false);
  const [showCameraRequestModal, setShowCameraRequestModal] = React.useState(false);
  const [showTermsModal, setShowTermsModal] = React.useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = React.useState(false);

  // Cargar preferencias guardadas
  React.useEffect(() => {
    if (visible) {
      loadPreferences();
    }
  }, [visible]);

  const loadPreferences = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@theme_mode');
      const savedNotifications = await AsyncStorage.getItem('@notifications_enabled');
      
      if (savedTheme) {
        setThemeMode(savedTheme as ThemeMode);
      }
      if (savedNotifications !== null) {
        setNotificationsEnabled(savedNotifications === 'true');
      }
    } catch (error) {
}
  };

  const handleThemeModePress = () => {
    setShowThemeSelector(true);
  };

  const handleThemeSelect = async (mode: ThemeMode) => {
    try {
      setThemeMode(mode);
      // Persistencia y notificación global a toda la app (incluye mapas)
      await setAppThemeMode(mode);
      setShowThemeSelector(false);
      
      AppAlert.alert('Tema actualizado', 'El tema se ha aplicado correctamente');
    } catch (error) {
AppAlert.alert('Error', 'No se pudo guardar la preferencia de tema');
    }
  };

  const handleNotificationsPress = async () => {
    const newValue = !notificationsEnabled;
    
    try {
      if (newValue) {
        // Activar notificaciones: registrar el token
        const token = await registerForPushNotifications();
        
        if (token) {
          setNotificationsEnabled(true);
          await AsyncStorage.setItem('@notifications_enabled', 'true');
          AppAlert.alert(
            'Notificaciones activadas',
            'Recibirás alertas sobre el estado de tus denuncias'
          );
        } else {
          // Si no se pudo obtener el token, mostrar error
          AppAlert.alert(
            'Error',
            'No se pudieron activar las notificaciones. Verifica los permisos de la aplicación.'
          );
        }
      } else {
        // Desactivar notificaciones: eliminar el token
        await unregisterPushNotifications();
        setNotificationsEnabled(false);
        await AsyncStorage.setItem('@notifications_enabled', 'false');
        AppAlert.alert(
          'Notificaciones desactivadas',
          'No recibirás alertas sobre tus denuncias'
        );
      }
    } catch (error) {
AppAlert.alert(
        'Error',
        'Hubo un problema al cambiar el estado de las notificaciones'
      );
    }
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light':
        return 'Claro';
      case 'dark':
        return 'Oscuro';
      case 'system':
        return 'Sistema';
      default:
        return 'Sistema';
    }
  };

  const getFontSizeLabel = () => {
    switch (fontSize) {
      case 'small':
        return 'Pequeño';
      case 'medium':
        return 'Mediano';
      case 'large':
        return 'Grande';
      default:
        return 'Mediano';
    }
  };

  const handleFontSizePress = () => {
    setShowFontSizeSelector(true);
  };

  const handleFontSizeSelect = async (size: 'small' | 'medium' | 'large') => {
    try {
      await setGlobalFontSize(size);
      setShowFontSizeSelector(false);
      AppAlert.alert('Tamaño de letra actualizado', 'El cambio se aplicó inmediatamente');
    } catch (error) {
AppAlert.alert('Error', 'No se pudo guardar la preferencia');
    }
  };

  const handleCameraRequestPress = () => {
    setShowCameraRequestModal(true);
  };

  const handleTermsPress = () => {
    setShowTermsModal(true);
  };

  const handlePrivacyPress = () => {
    setShowPrivacyModal(true);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Text style={[styles.title, { color: textColor, fontSize: getFontSizeValue(fontSize, 20) }]}>Configuración</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="close" size={24} color={mutedColor} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: (insets.bottom || 0) }}
          >
            {/* Sección Apariencia */}
            <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>APARIENCIA</Text>
              
              <TouchableOpacity 
                style={[styles.settingItem, { backgroundColor: itemBg }]}
                onPress={handleThemeModePress}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: accentColor }]}>
                    <IconSymbol name="brightness-6" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.settingText}>
                      <Text style={[styles.settingLabel, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                      Tema de la aplicación
                    </Text>
                      <Text style={[styles.settingDescription, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 13) }]}>
                      Actual: {getThemeLabel()}
                    </Text>
                  </View>
                </View>
                <IconSymbol name="chevron-right" size={20} color={mutedColor} />
              </TouchableOpacity>

              <View style={styles.separator} />

              <TouchableOpacity 
                style={[styles.settingItem, { backgroundColor: itemBg }]}
                onPress={handleFontSizePress}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: accentColor }]}>
                    <IconSymbol name="text-fields" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.settingText}>
                      <Text style={[styles.settingLabel, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                      Tamaño de letra
                    </Text>
                      <Text style={[styles.settingDescription, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 13) }]}>
                      Actual: {getFontSizeLabel()}
                    </Text>
                  </View>
                </View>
                <IconSymbol name="chevron-right" size={20} color={mutedColor} />
              </TouchableOpacity>
            </View>
            {/* Sección Solicitudes (solo para ciudadanos) */}
            {!inspector && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>SOLICITUDES</Text>
                
                <TouchableOpacity 
                  style={[styles.settingItem, { backgroundColor: itemBg }]}
                  onPress={handleCameraRequestPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: accentColor }]}>
                      <IconSymbol name="camera" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={[styles.settingLabel, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                        Solicitar cámaras
                      </Text>
                      <Text style={[styles.settingDescription, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 13) }]}>
                        Enviar solicitud a central cámaras
                      </Text>
                    </View>
                  </View>
                  <IconSymbol name="chevron-right" size={20} color={mutedColor} />
                </TouchableOpacity>
              </View>
            )}

            {/* Sección Notificaciones (solo para ciudadanos) */}
            {!inspector && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>NOTIFICACIONES</Text>
                
                <TouchableOpacity 
                  style={[styles.settingItem, { backgroundColor: itemBg }]}
                  onPress={handleNotificationsPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: notificationsEnabled ? accentColor : mutedColor }]}>
                      <IconSymbol name="notifications" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.settingText}>
                        <Text style={[styles.settingLabel, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                        Estado de denuncias
                      </Text>
                        <Text style={[styles.settingDescription, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 13) }]}>
                        {notificationsEnabled ? 'Activadas' : 'Desactivadas'}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: notificationsEnabled ? '#10B981' : '#EF4444' }
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {notificationsEnabled ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Sección Legal (solo para ciudadanos) */}
            {!inspector && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>LEGAL</Text>
                
                <TouchableOpacity 
                  style={[styles.settingItem, { backgroundColor: itemBg }]}
                  onPress={handleTermsPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: accentColor }]}>
                      <IconSymbol name="description" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.settingText}>
                        <Text style={[styles.settingLabel, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                        Términos y Condiciones
                      </Text>
                        <Text style={[styles.settingDescription, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 13) }]}>
                        Lee nuestros términos de uso
                      </Text>
                    </View>
                  </View>
                  <IconSymbol name="chevron-right" size={20} color={mutedColor} />
                </TouchableOpacity>

                <View style={styles.separator} />

                <TouchableOpacity 
                  style={[styles.settingItem, { backgroundColor: itemBg }]}
                  onPress={handlePrivacyPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: accentColor }]}>
                      <IconSymbol name="security" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.settingText}>
                        <Text style={[styles.settingLabel, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                        Políticas de Privacidad
                      </Text>
                        <Text style={[styles.settingDescription, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 13) }]}>
                        Conoce cómo protegemos tus datos
                      </Text>
                    </View>
                  </View>
                  <IconSymbol name="chevron-right" size={20} color={mutedColor} />
                </TouchableOpacity>
              </View>
            )}

            {/* Información de la app */}
            <View style={styles.appInfo}>
                <Text style={[styles.appVersion, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>
                Versión 1.0.0
              </Text>
                <Text style={[styles.appCopyright, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 11) }]}>
                © 2025 Sistema de Denuncias
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Modal selector de temas */}
      <Modal
        visible={showThemeSelector}
        animationType="slide"
        transparent
        onRequestClose={() => setShowThemeSelector(false)}
      >
        <TouchableOpacity 
          style={styles.themeSelectorOverlay}
          activeOpacity={1}
          onPress={() => setShowThemeSelector(false)}
        >
          <View style={[
            styles.themeSelectorContainer,
            { backgroundColor: bgColor, paddingBottom: (insets.bottom || 0) + 20 }
          ]}>
            <View style={[styles.themeSelectorHeader, { borderBottomColor: borderColor }]}>
            <Text style={[styles.themeSelectorTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 18) }]}>
                Seleccionar Tema
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.themeOption,
                themeMode === 'light' && { backgroundColor: accentColor }
              ]}
              onPress={() => handleThemeSelect('light')}
              activeOpacity={0.7}
            >
              <IconSymbol 
                name="wb-sunny" 
                size={24} 
                color={themeMode === 'light' ? '#FFFFFF' : textColor} 
              />
              <Text style={[
                styles.themeOptionText,
                  { color: themeMode === 'light' ? '#FFFFFF' : textColor, fontSize: getFontSizeValue(fontSize, 16) }
              ]}>
                Claro
              </Text>
              {themeMode === 'light' && (
                <IconSymbol name="check" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                themeMode === 'dark' && { backgroundColor: accentColor }
              ]}
              onPress={() => handleThemeSelect('dark')}
              activeOpacity={0.7}
            >
              <IconSymbol 
                name="nightlight" 
                size={24} 
                color={themeMode === 'dark' ? '#FFFFFF' : textColor} 
              />
              <Text style={[
                styles.themeOptionText,
                  { color: themeMode === 'dark' ? '#FFFFFF' : textColor, fontSize: getFontSizeValue(fontSize, 16) }
              ]}>
                Oscuro
              </Text>
              {themeMode === 'dark' && (
                <IconSymbol name="check" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                themeMode === 'system' && { backgroundColor: accentColor }
              ]}
              onPress={() => handleThemeSelect('system')}
              activeOpacity={0.7}
            >
              <IconSymbol 
                name="smartphone" 
                size={24} 
                color={themeMode === 'system' ? '#FFFFFF' : textColor} 
              />
              <Text style={[
                styles.themeOptionText,
                  { color: themeMode === 'system' ? '#FFFFFF' : textColor, fontSize: getFontSizeValue(fontSize, 16) }
              ]}>
                Sistema
              </Text>
              {themeMode === 'system' && (
                <IconSymbol name="check" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeCancelButton, { borderColor: accentColor }]}
              onPress={() => setShowThemeSelector(false)}
              activeOpacity={0.7}
            >
                <Text style={[styles.themeCancelText, { color: accentColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal selector de tamaño de letra */}
      <Modal
        visible={showFontSizeSelector}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFontSizeSelector(false)}
      >
        <TouchableOpacity 
          style={styles.themeSelectorOverlay}
          activeOpacity={1}
          onPress={() => setShowFontSizeSelector(false)}
        >
          <View style={[
            styles.themeSelectorContainer,
            { backgroundColor: bgColor, paddingBottom: (insets.bottom || 0) + 20 }
          ]}>
            <View style={[styles.themeSelectorHeader, { borderBottomColor: borderColor }]}>
            <Text style={[styles.themeSelectorTitle, { color: textColor, fontSize: getFontSizeValue(fontSize, 18) }]}>
                Seleccionar Tamaño
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.themeOption,
                fontSize === 'small' && { backgroundColor: accentColor }
              ]}
              onPress={() => handleFontSizeSelect('small')}
              activeOpacity={0.7}
            >
              <IconSymbol 
                name="text-fields" 
                size={20} 
                color={fontSize === 'small' ? '#FFFFFF' : textColor} 
              />
              <Text style={[
                styles.themeOptionText,
                  { color: fontSize === 'small' ? '#FFFFFF' : textColor, fontSize: getFontSizeValue(fontSize, 16) }
              ]}>
                Pequeño
              </Text>
              {fontSize === 'small' && (
                <IconSymbol name="check" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                fontSize === 'medium' && { backgroundColor: accentColor }
              ]}
              onPress={() => handleFontSizeSelect('medium')}
              activeOpacity={0.7}
            >
              <IconSymbol 
                name="text-fields" 
                size={24} 
                color={fontSize === 'medium' ? '#FFFFFF' : textColor} 
              />
              <Text style={[
                styles.themeOptionText,
                  { color: fontSize === 'medium' ? '#FFFFFF' : textColor, fontSize: getFontSizeValue(fontSize, 16) }
              ]}>
                Mediano
              </Text>
              {fontSize === 'medium' && (
                <IconSymbol name="check" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                fontSize === 'large' && { backgroundColor: accentColor }
              ]}
              onPress={() => handleFontSizeSelect('large')}
              activeOpacity={0.7}
            >
              <IconSymbol 
                name="text-fields" 
                size={28} 
                color={fontSize === 'large' ? '#FFFFFF' : textColor} 
              />
              <Text style={[
                styles.themeOptionText,
                  { color: fontSize === 'large' ? '#FFFFFF' : textColor, fontSize: getFontSizeValue(fontSize, 18) }
              ]}>
                Grande
              </Text>
              {fontSize === 'large' && (
                <IconSymbol name="check" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeCancelButton, { borderColor: accentColor }]}
              onPress={() => setShowFontSizeSelector(false)}
              activeOpacity={0.7}
            >
                <Text style={[styles.themeCancelText, { color: accentColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal para solicitar cámaras */}
      <CameraRequestModal
        visible={showCameraRequestModal}
        onClose={() => setShowCameraRequestModal(false)}
      />

      {/* Modal de Términos y Condiciones */}
      <TermsModal 
        visible={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />

      {/* Modal de Políticas de Privacidad */}
      <PrivacyModal 
        visible={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
      />
    </Modal>
    );
  }

// Función helper para escalar tamaños de fuente
function getFontSizeValue(fontSize: 'small' | 'medium' | 'large', base: number): number {
  switch (fontSize) {
    case 'small':
      return base * 0.85;
    case 'medium':
      return base;
    case 'large':
      return base * 1.25;
    default:
      return base;
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 72,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 4,
  },
  appVersion: {
    fontSize: 14,
    fontWeight: '500',
  },
  appCopyright: {
    fontSize: 12,
  },
  themeSelectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  themeSelectorContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  themeSelectorHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  themeSelectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  themeOptionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  themeCancelButton: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  themeCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
