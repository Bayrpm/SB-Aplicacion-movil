import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PrivacyModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ visible, onClose }: PrivacyModalProps) {
  const insets = useSafeAreaInsets();
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
              Política de Privacidad
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="close" size={24} color={mutedColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 24 }}>
            {/* Introducción */}
            <View style={styles.section}>
              <Text style={[styles.paragraph, { color: textColor }]}>
                La Municipalidad de San Bernardo valora y respeta su privacidad. Esta Política de Privacidad 
                describe cómo recopilamos, usamos, almacenamos y protegemos su información personal cuando 
                utiliza nuestra aplicación de Denuncias Ciudadanas.
              </Text>
              <Text style={[styles.date, { color: mutedColor }]}>
                Última actualización: Noviembre 2025
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Esta política cumple con la Ley N° 19.628 sobre Protección de la Vida Privada y el Reglamento 
                General de Protección de Datos (GDPR) cuando sea aplicable.
              </Text>
            </View>

            {/* 1. Información que Recopilamos */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                1. INFORMACIÓN QUE RECOPILAMOS
              </Text>
              
              <Text style={[styles.subsectionTitle, { color: textColor }]}>
                1.1 Información Personal de Registro
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Cuando crea una cuenta, recopilamos:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Nombre completo
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Apellidos
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Correo electrónico
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Número de teléfono
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Contraseña encriptada
                </Text>
              </View>

              <Text style={[styles.subsectionTitle, { color: textColor }]}>
                1.2 Información de Ubicación
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Con su consentimiento, recopilamos:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Coordenadas GPS de sus reportes
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Dirección aproximada de los incidentes
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Historial de ubicaciones de reportes anteriores
                </Text>
              </View>

              <Text style={[styles.subsectionTitle, { color: textColor }]}>
                1.3 Contenido Generado por el Usuario
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Descripciones de reportes
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Fotografías y videos adjuntos
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Comentarios y actualizaciones
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Solicitudes de cámaras de seguridad
                </Text>
              </View>

              <Text style={[styles.subsectionTitle, { color: textColor }]}>
                1.4 Información Técnica
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Tipo y modelo de dispositivo
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Sistema operativo y versión
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Dirección IP
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Identificador único del dispositivo
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Registros de uso y actividad
                </Text>
              </View>
            </View>

            {/* 2. Cómo Usamos su Información */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                2. CÓMO USAMOS SU INFORMACIÓN
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Utilizamos la información recopilada para:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • <Text style={{ fontWeight: '600' }}>Gestionar reportes:</Text> Procesar, dar seguimiento y 
                  resolver las denuncias ciudadanas
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • <Text style={{ fontWeight: '600' }}>Mejorar servicios municipales:</Text> Identificar patrones 
                  y áreas que requieren atención prioritaria
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • <Text style={{ fontWeight: '600' }}>Comunicación:</Text> Enviar notificaciones sobre el estado 
                  de sus reportes
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • <Text style={{ fontWeight: '600' }}>Seguridad:</Text> Prevenir fraudes, abusos y uso indebido 
                  de la plataforma
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • <Text style={{ fontWeight: '600' }}>Análisis estadístico:</Text> Generar informes y métricas 
                  anónimas para planificación urbana
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • <Text style={{ fontWeight: '600' }}>Cumplimiento legal:</Text> Responder a solicitudes legales 
                  y cooperar con autoridades
                </Text>
              </View>
            </View>

            {/* 3. Compartir Información */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                3. COMPARTIR SU INFORMACIÓN
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Su información puede ser compartida con:
              </Text>
              
              <Text style={[styles.subsectionTitle, { color: textColor }]}>
                3.1 Autoridades Competentes
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Compartimos información con Carabineros de Chile, PDI, Fiscalía y otras entidades cuando:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Es necesario para investigaciones criminales
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Se requiere para la prevención del delito
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Es ordenado por resolución judicial
                </Text>
              </View>

              <Text style={[styles.subsectionTitle, { color: textColor }]}>
                3.2 Departamentos Municipales
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Sus reportes pueden ser compartidos internamente con departamentos relevantes 
                (Obras, Aseo, Seguridad) para su gestión y resolución.
              </Text>

              <Text style={[styles.subsectionTitle, { color: textColor }]}>
                3.3 Información Pública
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Los reportes marcados como públicos serán visibles en el mapa de la aplicación para todos 
                los usuarios, mostrando únicamente:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Ubicación del incidente
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Categoría del reporte
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Descripción básica (sin datos personales)
                </Text>
              </View>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Su nombre y datos de contacto nunca serán mostrados públicamente.
              </Text>
            </View>

            {/* 4. Almacenamiento y Seguridad */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                4. ALMACENAMIENTO Y SEGURIDAD
              </Text>
              
              <Text style={[styles.subsectionTitle, { color: textColor }]}>
                4.1 Medidas de Seguridad
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Implementamos medidas técnicas y organizativas para proteger su información:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Encriptación de datos en tránsito (TLS/SSL)
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Encriptación de contraseñas (bcrypt)
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Servidores seguros con acceso restringido
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Auditorías de seguridad periódicas
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Respaldos automáticos diarios
                </Text>
              </View>

              <Text style={[styles.subsectionTitle, { color: textColor }]}>
                4.2 Ubicación de Datos
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Sus datos se almacenan en servidores ubicados en Chile, cumpliendo con la normativa local 
                de protección de datos.
              </Text>

              <Text style={[styles.subsectionTitle, { color: textColor }]}>
                4.3 Periodo de Retención
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Conservamos su información personal:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Datos de cuenta: Mientras su cuenta esté activa
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Reportes: Hasta 5 años después del cierre del caso
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Registros técnicos: Hasta 12 meses
                </Text>
              </View>
            </View>

            {/* 5. Sus Derechos */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                5. SUS DERECHOS
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Conforme a la Ley N° 19.628, usted tiene derecho a:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • <Text style={{ fontWeight: '600' }}>Acceso:</Text> Solicitar una copia de sus datos personales
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • <Text style={{ fontWeight: '600' }}>Rectificación:</Text> Corregir información inexacta o incompleta
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • <Text style={{ fontWeight: '600' }}>Eliminación:</Text> Solicitar la eliminación de su cuenta y datos
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • <Text style={{ fontWeight: '600' }}>Oposición:</Text> Oponerse al procesamiento de sus datos
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • <Text style={{ fontWeight: '600' }}>Portabilidad:</Text> Recibir sus datos en formato estructurado
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • <Text style={{ fontWeight: '600' }}>Revocación:</Text> Retirar su consentimiento en cualquier momento
                </Text>
              </View>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Para ejercer estos derechos, contáctenos a través de los canales indicados al final de este documento.
              </Text>
            </View>

            {/* 6. Cookies y Tecnologías Similares */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                6. COOKIES Y TECNOLOGÍAS SIMILARES
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                La aplicación utiliza tecnologías de seguimiento para mejorar su experiencia:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Tokens de sesión para mantenerlo autenticado
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Almacenamiento local para preferencias de usuario
                </Text>
                <Text style={[styles.bullet, { color: textColor }]}>
                  • Analytics para mejorar el rendimiento de la aplicación
                </Text>
              </View>
            </View>

            {/* 7. Menores de Edad */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                7. MENORES DE EDAD
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Esta aplicación está destinada a usuarios mayores de 18 años. No recopilamos intencionalmente 
                información de menores de edad. Si un padre o tutor descubre que su hijo ha proporcionado 
                información personal, debe contactarnos inmediatamente para su eliminación.
              </Text>
            </View>

            {/* 8. Modificaciones */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                8. MODIFICACIONES A ESTA POLÍTICA
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Podemos actualizar esta Política de Privacidad periódicamente. Las modificaciones significativas 
                serán notificadas a través de la aplicación o por correo electrónico. Le recomendamos revisar 
                esta política regularmente.
              </Text>
            </View>

            {/* 9. Contacto y Reclamos */}
            <View style={[styles.section, { marginBottom: 32 }]}>
              <Text style={[styles.sectionTitle, { color: accentColor }]}>
                9. CONTACTO Y RECLAMOS
              </Text>
              <Text style={[styles.paragraph, { color: textColor }]}>
                Para preguntas, solicitudes o reclamos sobre privacidad:
              </Text>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactText, { color: textColor }]}>
                  <Text style={{ fontWeight: '600' }}>Oficial de Protección de Datos</Text>
                </Text>
                <Text style={[styles.contactText, { color: textColor }]}>
                  Municipalidad de San Bernardo
                </Text>
                <Text style={[styles.contactText, { color: textColor }]}>
                  Departamento de Seguridad Ciudadana
                </Text>
                <Text style={[styles.contactText, { color: accentColor }]}>
                  privacidad@sanbernardo.cl
                </Text>
                <Text style={[styles.contactText, { color: accentColor }]}>
                  Tel: +56 2 2518 8000
                </Text>
                <Text style={[styles.contactText, { color: textColor }]}>
                  Dirección: Av. Eyzaguirre 470, San Bernardo
                </Text>
              </View>
              <Text style={[styles.paragraph, { color: textColor, marginTop: 16 }]}>
                Si no está satisfecho con nuestra respuesta, puede presentar un reclamo ante el 
                Consejo para la Transparencia de Chile.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Button */}
          <View style={[styles.footer, { borderTopColor: borderColor, paddingBottom: (insets.bottom || 0) + 12 }]}>
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
  subsectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
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
    marginBottom: 8,
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
