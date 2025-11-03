// app/features/profileCitizen/components/cameraRequestModal.tsx
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface CameraRequestModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CameraRequestModal({
  visible,
  onClose,
}: CameraRequestModalProps) {
  const { fontSize } = useFontSize();
  const bgColor = useThemeColor({ light: '#FFFFFF', dark: '#071229' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'icon');
  const accentColor = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#374151' }, 'icon');
  const inputBg = useThemeColor({ light: '#F9FAFB', dark: '#000000' }, 'background');

  // Datos del solicitante
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccionDomicilio, setDireccionDomicilio] = useState('');

  // Detalles de la solicitud
  const [ubicacionCamara, setUbicacionCamara] = useState('');
  const [referenciaLugar, setReferenciaLugar] = useState('');
  const [motivoSolicitud, setMotivoSolicitud] = useState('');
  const [tipoProblema, setTipoProblema] = useState('');
  const [horarioCritico, setHorarioCritico] = useState('');
  const [numeroCamaras, setNumeroCamaras] = useState('1');
  
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [sending, setSending] = useState(false);

  const handleCancel = () => {
    // Limpiar todos los campos
    setNombreCompleto('');
    setRut('');
    setTelefono('');
    setEmail('');
    setDireccionDomicilio('');
    setUbicacionCamara('');
    setReferenciaLugar('');
    setMotivoSolicitud('');
    setTipoProblema('');
    setHorarioCritico('');
    setNumeroCamaras('1');
    setAceptaTerminos(false);
    onClose();
  };

  const handleSend = async () => {
    // Validaciones de campos obligatorios
    if (!nombreCompleto.trim()) {
      AppAlert.alert('Error', 'El nombre completo es requerido');
      return;
    }

    if (!rut.trim()) {
      AppAlert.alert('Error', 'El RUT es requerido');
      return;
    }

    if (!telefono.trim()) {
      AppAlert.alert('Error', 'El teléfono es requerido');
      return;
    }

    if (!email.trim()) {
      AppAlert.alert('Error', 'El email es requerido');
      return;
    }

    if (!direccionDomicilio.trim()) {
      AppAlert.alert('Error', 'La dirección de domicilio es requerida');
      return;
    }

    if (!ubicacionCamara.trim()) {
      AppAlert.alert('Error', 'La ubicación de la cámara es requerida');
      return;
    }

    if (!motivoSolicitud.trim()) {
      AppAlert.alert('Error', 'El motivo de la solicitud es requerido');
      return;
    }

    if (!tipoProblema.trim()) {
      AppAlert.alert('Error', 'El tipo de problema es requerido');
      return;
    }

    if (!aceptaTerminos) {
      AppAlert.alert('Error', 'Debe aceptar los términos y condiciones');
      return;
    }

    setSending(true);
    try {
      // TODO: Implementar envío de solicitud al backend
      const requestData = {
        nombreCompleto,
        rut,
        telefono,
        email,
        direccionDomicilio,
        ubicacionCamara,
        referenciaLugar,
        motivoSolicitud,
        tipoProblema,
        horarioCritico,
        numeroCamaras,
      };
      
      // Simulación
      await new Promise(resolve => setTimeout(resolve, 1500));

      AppAlert.alert(
        'Solicitud enviada', 
        'Su solicitud formal ha sido registrada exitosamente. Será evaluada por el Departamento de Seguridad Municipal y recibirá una respuesta en un plazo máximo de 15 días hábiles.', 
        [
          {
            text: 'Entendido',
            onPress: () => {
              handleCancel();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error al enviar solicitud:', error);
      AppAlert.alert('Error', 'No se pudo enviar la solicitud. Por favor, intente nuevamente.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={[styles.title, { color: textColor, fontSize: getFontSizeValue(fontSize, 20) }]}>
                Solicitud Formal de Cámaras de Seguridad
              </Text>
              <Text style={[styles.subtitle, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 13) }]}>
                Municipalidad de San Bernardo
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <IconSymbol name="close" size={24} color={mutedColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Instrucciones iniciales */}
            <View style={[styles.infoBox, { backgroundColor: inputBg, borderColor }]}>
              <IconSymbol name="info" size={20} color={accentColor} />
              <Text style={[styles.infoText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 13) }]}>
                Complete todos los campos marcados con (*). Su solicitud será evaluada por el Departamento de Seguridad Municipal.
              </Text>
            </View>

            {/* SECCIÓN 1: DATOS DEL SOLICITANTE */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: accentColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                1. DATOS DEL SOLICITANTE
              </Text>

              {/* Nombre Completo */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                  Nombre completo <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                  <IconSymbol name="person" size={20} color={accentColor} />
                  <TextInput
                    style={[styles.input, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                    value={nombreCompleto}
                    onChangeText={setNombreCompleto}
                    placeholder="Nombres y apellidos completos"
                    placeholderTextColor={mutedColor}
                    editable={!sending}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* RUT */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                  RUT <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                  <IconSymbol name="badge" size={20} color={accentColor} />
                  <TextInput
                    style={[styles.input, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                    value={rut}
                    onChangeText={setRut}
                    placeholder="12.345.678-9"
                    placeholderTextColor={mutedColor}
                    editable={!sending}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Teléfono */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                  Teléfono de contacto <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                  <IconSymbol name="phone" size={20} color={accentColor} />
                  <TextInput
                    style={[styles.input, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                    value={telefono}
                    onChangeText={setTelefono}
                    placeholder="+56 9 1234 5678"
                    placeholderTextColor={mutedColor}
                    editable={!sending}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                  Correo electrónico <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                  <IconSymbol name="mail" size={20} color={accentColor} />
                  <TextInput
                    style={[styles.input, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor={mutedColor}
                    editable={!sending}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Dirección domicilio */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                  Dirección de domicilio <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                  <IconSymbol name="home" size={20} color={accentColor} />
                  <TextInput
                    style={[styles.input, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                    value={direccionDomicilio}
                    onChangeText={setDireccionDomicilio}
                    placeholder="Calle, número, comuna"
                    placeholderTextColor={mutedColor}
                    editable={!sending}
                  />
                </View>
              </View>
            </View>

            {/* SECCIÓN 2: DETALLES DE LA SOLICITUD */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: accentColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                2. DETALLES DE LA SOLICITUD
              </Text>

              {/* Ubicación exacta */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                  Ubicación exacta solicitada <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                  <IconSymbol name="location-pin" size={20} color={accentColor} />
                  <TextInput
                    style={[styles.input, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                    value={ubicacionCamara}
                    onChangeText={setUbicacionCamara}
                    placeholder="Ej: Calle Los Robles esquina Av. Portales"
                    placeholderTextColor={mutedColor}
                    editable={!sending}
                  />
                </View>
              </View>

              {/* Referencias del lugar */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                  Referencias del lugar
                </Text>
                <View style={[styles.textAreaContainer, { backgroundColor: inputBg, borderColor }]}>
                  <TextInput
                    style={[styles.textArea, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                    value={referenciaLugar}
                    onChangeText={setReferenciaLugar}
                    placeholder="Ej: Frente al supermercado Líder, cerca de la plaza principal"
                    placeholderTextColor={mutedColor}
                    multiline
                    numberOfLines={2}
                    editable={!sending}
                  />
                </View>
              </View>

              {/* Tipo de problema */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                  Tipo de problema de seguridad <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <View style={[styles.textAreaContainer, { backgroundColor: inputBg, borderColor }]}>
                  <TextInput
                    style={[styles.textArea, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                    value={tipoProblema}
                    onChangeText={setTipoProblema}
                    placeholder="Ej: Robos frecuentes, vandalismo, tráfico de drogas, asaltos, etc."
                    placeholderTextColor={mutedColor}
                    multiline
                    numberOfLines={2}
                    editable={!sending}
                  />
                </View>
              </View>

              {/* Motivo detallado */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                  Motivo detallado de la solicitud <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <View style={[styles.textAreaContainer, { backgroundColor: inputBg, borderColor }]}>
                  <TextInput
                    style={[styles.textArea, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                    value={motivoSolicitud}
                    onChangeText={setMotivoSolicitud}
                    placeholder="Describa detalladamente la situación, frecuencia de incidentes, afectación a la comunidad y necesidad de implementar cámaras de seguridad"
                    placeholderTextColor={mutedColor}
                    multiline
                    numberOfLines={5}
                    editable={!sending}
                  />
                </View>
                <Text style={[styles.helpText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }]}>
                  Sea lo más específico posible. Esta información es fundamental para evaluar su solicitud.
                </Text>
              </View>

              {/* Horario crítico */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                  Horario crítico (opcional)
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                  <IconSymbol name="clock" size={20} color={accentColor} />
                  <TextInput
                    style={[styles.input, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                    value={horarioCritico}
                    onChangeText={setHorarioCritico}
                    placeholder="Ej: Entre 22:00 y 06:00 hrs"
                    placeholderTextColor={mutedColor}
                    editable={!sending}
                  />
                </View>
              </View>

              {/* Número de cámaras */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>
                  Número de cámaras solicitadas
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                  <IconSymbol name="camera" size={20} color={accentColor} />
                  <TextInput
                    style={[styles.input, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}
                    value={numeroCamaras}
                    onChangeText={setNumeroCamaras}
                    placeholder="1"
                    placeholderTextColor={mutedColor}
                    editable={!sending}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            {/* SECCIÓN 3: DECLARACIÓN */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: accentColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                3. DECLARACIÓN
              </Text>

              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={() => setAceptaTerminos(!aceptaTerminos)}
                disabled={sending}
              >
                <View style={[
                  styles.checkbox, 
                  { borderColor },
                  aceptaTerminos && { backgroundColor: accentColor, borderColor: accentColor }
                ]}>
                  {aceptaTerminos && (
                    <IconSymbol name="check" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={[styles.checkboxLabel, { color: textColor, fontSize: getFontSizeValue(fontSize, 13) }]}>
                  Declaro que la información proporcionada es verídica y autorizo a la Municipalidad de San Bernardo a verificar los datos aquí consignados. Comprendo que esta solicitud será evaluada por el Departamento de Seguridad Municipal. <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
              </TouchableOpacity>

              <View style={[styles.warningBox, { backgroundColor: inputBg, borderColor: '#F59E0B' }]}>
                <IconSymbol name="warning" size={20} color="#F59E0B" />
                <Text style={[styles.warningText, { color: textColor, fontSize: getFontSizeValue(fontSize, 12) }]}>
                  El proceso de evaluación puede tomar hasta 15 días hábiles. Recibirá notificación de la respuesta vía email y/o teléfono.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Botones de acción */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                {
                  borderColor: accentColor,
                  backgroundColor: 'transparent'
                }
              ]}
              onPress={handleCancel}
              disabled={sending}
            >
              <Text style={[styles.cancelButtonText, { color: textColor, fontSize: getFontSizeValue(fontSize, 16) }]}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.sendButton,
                { backgroundColor: accentColor },
                sending && styles.disabledButton,
              ]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <IconSymbol name="send" size={18} color="#FFFFFF" />
                  <Text style={[styles.sendButtonText, { fontSize: getFontSizeValue(fontSize, 16) }]}>
                    Enviar Solicitud
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontWeight: '700',
    lineHeight: 26,
  },
  subtitle: {
    marginTop: 4,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  textAreaContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helpText: {
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontWeight: '500',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxLabel: {
    flex: 1,
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    lineHeight: 18,
  },
});
