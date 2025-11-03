import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function TermsModal({ visible, onClose }: TermsModalProps) {
  const bgColor = useThemeColor({ light: '#FFFFFF', dark: '#071229' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'icon');
  const accentColor = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#374151' }, 'icon');

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
            <Text style={[styles.title, { color: textColor }]}>
              Términos y Condiciones
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="close" size={24} color={mutedColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            {/* Introducción */}
            <View style={styles.section}>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Bienvenido a la aplicación oficial de Denuncias Ciudadanas de la Municipalidad de San Bernardo. 
                Al utilizar esta aplicación, usted acepta los siguientes términos y condiciones.
              </Text>
              <Text style={[styles.date, { color: mutedColor }]}>
                Última actualización: Noviembre 2025
              </Text>
            </View>

            {/* 1. Aceptación de Términos */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                1. ACEPTACIÓN DE TÉRMINOS
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Al acceder y utilizar esta aplicación móvil, usted acepta estar sujeto a estos Términos y Condiciones, 
                todas las leyes y regulaciones aplicables, y acepta que es responsable del cumplimiento de todas las 
                leyes locales aplicables. Si no está de acuerdo con alguno de estos términos, tiene prohibido usar o 
                acceder a esta aplicación.
              </Text>
            </View>

            {/* 2. Descripción del Servicio */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                2. DESCRIPCIÓN DEL SERVICIO
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Esta aplicación permite a los ciudadanos de San Bernardo:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Reportar incidentes de seguridad y problemas en la vía pública
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Hacer seguimiento del estado de sus denuncias
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Visualizar reportes públicos en mapas interactivos
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Recibir notificaciones sobre el estado de sus reportes
                </Text>
              </View>
            </View>

            {/* 3. Registro y Cuenta de Usuario */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                3. REGISTRO Y CUENTA DE USUARIO
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Para utilizar ciertas funciones de la aplicación, debe registrarse y crear una cuenta. Usted se compromete a:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Proporcionar información verdadera, precisa y completa
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Mantener actualizada su información de contacto
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Mantener la confidencialidad de su contraseña
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Notificar inmediatamente cualquier uso no autorizado de su cuenta
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Ser el único responsable de todas las actividades realizadas desde su cuenta
                </Text>
              </View>
            </View>

            {/* 4. Uso Apropiado */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                4. USO APROPIADO DE LA APLICACIÓN
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                El usuario se compromete a utilizar la aplicación exclusivamente para fines legítimos. 
                Está estrictamente prohibido:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Realizar denuncias falsas o información engañosa
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Utilizar la aplicación para hostigar, amenazar o difamar a terceros
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Intentar acceder a áreas restringidas de la aplicación
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Interferir con el funcionamiento normal de la aplicación
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Transmitir virus, malware o código malicioso
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Realizar ingeniería inversa de la aplicación
                </Text>
              </View>
            </View>

            {/* 5. Contenido del Usuario */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                5. CONTENIDO DEL USUARIO
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Al enviar reportes, fotografías o cualquier contenido a través de la aplicación:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Usted garantiza que tiene los derechos necesarios sobre el contenido
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Otorga a la Municipalidad una licencia para usar, modificar y compartir el contenido con fines 
                  de gestión municipal y seguridad pública
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • El contenido puede ser compartido con autoridades competentes cuando sea necesario
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • La Municipalidad se reserva el derecho de eliminar contenido inapropiado
                </Text>
              </View>
            </View>

            {/* 6. Privacidad y Protección de Datos */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                6. PRIVACIDAD Y PROTECCIÓN DE DATOS
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                La recopilación y uso de información personal se rige por nuestra Política de Privacidad. 
                Al usar esta aplicación, usted consiente la recopilación y uso de información según lo descrito 
                en dicha política. Cumplimos con la Ley N° 19.628 sobre Protección de la Vida Privada de Chile.
              </Text>
            </View>

            {/* 7. Geolocalización */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                7. SERVICIOS DE GEOLOCALIZACIÓN
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                La aplicación utiliza servicios de geolocalización para:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Identificar la ubicación de los reportes
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Mostrar incidentes cercanos en el mapa
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Mejorar la respuesta de servicios municipales
                </Text>
              </View>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Usted puede desactivar los servicios de ubicación en cualquier momento desde la configuración de su dispositivo.
              </Text>
            </View>

            {/* 8. Disponibilidad del Servicio */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                8. DISPONIBILIDAD DEL SERVICIO
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                La Municipalidad se esfuerza por mantener la aplicación disponible 24/7, pero no garantiza:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Que la aplicación estará libre de interrupciones o errores
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Tiempo de respuesta específico para los reportes
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Resolución de todos los problemas reportados
                </Text>
              </View>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Nos reservamos el derecho de suspender o discontinuar el servicio por mantenimiento, 
                actualizaciones o razones técnicas.
              </Text>
            </View>

            {/* 9. Limitación de Responsabilidad */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                9. LIMITACIÓN DE RESPONSABILIDAD
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                La Municipalidad de San Bernardo no será responsable por:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Daños directos, indirectos, incidentales o consecuentes del uso de la aplicación
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Pérdida de datos o información
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Acceso no autorizado a su cuenta por negligencia del usuario
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Contenido generado por otros usuarios
                </Text>
              </View>
            </View>

            {/* 10. Modificaciones */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                10. MODIFICACIONES A LOS TÉRMINOS
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                La Municipalidad se reserva el derecho de modificar estos términos en cualquier momento. 
                Las modificaciones entrarán en vigor inmediatamente después de su publicación en la aplicación. 
                El uso continuado de la aplicación después de dichas modificaciones constituye su aceptación de 
                los términos modificados.
              </Text>
            </View>

            {/* 11. Ley Aplicable */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                11. LEY APLICABLE Y JURISDICCIÓN
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Estos términos se rigen por las leyes de la República de Chile. Cualquier disputa relacionada con 
                estos términos será sometida a la jurisdicción exclusiva de los tribunales competentes de San Bernardo, Chile.
              </Text>
            </View>

            {/* 12. Contacto */}
            <View style={[styles.section, { marginBottom: 32 }]}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                12. CONTACTO
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Para preguntas sobre estos Términos y Condiciones, puede contactarnos:
              </Text>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactText, { color: textColor }]}>
                  Municipalidad de San Bernardo
                </Text>
                <Text style={[styles.contactText, { color: textColor }]}>
                  Departamento de Seguridad Ciudadana
                </Text>
                <Text style={[styles.contactText, { color: accentColor }]}>
                  seguridad@sanber nardo.cl
                </Text>
                <Text style={[styles.contactText, { color: accentColor }]}>
                  Tel: +56 2 2518 8000
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Button */}
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            <TouchableOpacity
              style={[styles.acceptButton, { backgroundColor: accentColor }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '90%',
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
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  date: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  bulletList: {
    marginTop: 8,
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
    paddingLeft: 8,
  },
  contactInfo: {
    marginTop: 12,
    paddingLeft: 8,
  },
  contactText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  acceptButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
