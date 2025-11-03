import CameraRequestModal from '@/app/features/profileCitizen/components/cameraRequestModal';
import { useReportCategories } from '@/app/features/report/hooks/useReportCategories';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FollowSection from './followSection';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function MoreInfo({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const logoSource = scheme === 'dark'
    ? require('@/assets/images/img_logo_blanco.png')
    : require('@/assets/images/img_logo.png');

  const categories = useReportCategories();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);

  const toggleCollapse = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Mapa de iconos por defecto para las categorías
  const ICON_MAP: Record<number, string> = {
    1: 'ambulance',
    2: 'alert-circle-outline',
    3: 'shield-alert',
    4: 'pill',
    5: 'pistol',
    6: 'bell-ring-outline',
    7: 'police-badge',
    8: 'dots-horizontal',
  };

  const collapseItems = [
    {
      question: '¿Cuál es nuestra misión?',
      answer: 'Nuestra misión es fortalecer la participación ciudadana en San Bernardo, facilitando la comunicación directa entre vecinos y autoridades para construir una comunidad más segura y conectada.',
    },
    {
      question: '¿Qué es la aplicación?',
      answer: 'Es una plataforma digital que permite a los ciudadanos de San Bernardo reportar incidentes, denuncias y situaciones que afecten la seguridad y calidad de vida en su entorno, de forma rápida y sencilla.',
    },
    {
      question: '¿Cómo usar la aplicación?',
      answer: 'Regístrate con tu correo, selecciona la categoría del reporte que deseas hacer, describe el incidente con detalles y ubicación, y envía tu denuncia. Podrás hacer seguimiento del estado de tus reportes desde tu perfil.',
    },
    {
      question: '¿Qué significa cada categoría?',
      answer: null, // Contenido especial para categorías
      isCategories: true,
    },
    {
      question: '¿Cómo solicitar cámaras en la Municipalidad?',
      answer: null, // Contenido especial para solicitud de cámaras
      isCameraRequest: true,
    },
  ];

  const textColor = scheme === 'dark' ? '#E6EEF8' : '#0F1724';
  const cardBg = scheme === 'dark' ? '#1A1F2E' : '#FFFFFF';
  const borderColor = scheme === 'dark' ? '#2D3748' : '#E2E8F0';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: scheme === 'dark' ? '#0B0C0D' : '#FFFFFF' }]}>
        {/* Header con logo */}
        <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: scheme === 'dark' ? '#0B0C0D' : '#FFFFFF' }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="arrow-left" size={28} color={textColor} />
          </TouchableOpacity>
          <Image source={logoSource} style={styles.logo} contentFit="contain" />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Contenedor con barra azul, texto e imagen */}
          <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.blueLine} />
            <Text style={[styles.infoTitle, { color: textColor }]}>
              Dirección Pública de San Bernardo
            </Text>
            <Image 
              source={require('@/assets/images/delh.jpg')} 
              style={styles.infoImage}
              contentFit="cover"
            />
          </View>

          {/* Botones colapsables */}
          <View style={styles.collapseContainer}>
            {collapseItems.map((item, index) => (
              <View key={index} style={[styles.collapseItem, { backgroundColor: cardBg, borderColor }]}>
                <Pressable
                  onPress={() => toggleCollapse(index)}
                  style={styles.collapseHeader}
                >
                  <Text style={[styles.collapseQuestion, { color: textColor }]}>
                    {item.question}
                  </Text>
                  <IconSymbol 
                    name={expandedIndex === index ? 'expand-less' : 'expand-more'} 
                    size={24} 
                    color="#0A4A90" 
                  />
                </Pressable>
                {expandedIndex === index && (
                  <View style={styles.collapseContent}>
                    {(item as any).isCategories ? (
                      // Contenido especial para categorías
                      categories.length === 0 ? (
                        <View style={styles.categoriesLoading}>
                          <ActivityIndicator size="small" color="#0A4A90" />
                          <Text style={[styles.categoriesLoadingText, { color: textColor }]}>
                            Cargando categorías...
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.categoriesList}>
                          {categories.map((cat) => {
                            const iconName = (cat as any).icon ?? ICON_MAP[cat.id] ?? 'map-marker';
                            return (
                              <View key={cat.id} style={[styles.categoryItem, { borderBottomColor: borderColor }]}>
                                <View style={styles.categoryIconWrapper}>
                                  <IconSymbol name={iconName as any} size={24} color="#0A4A90" />
                                </View>
                                <View style={styles.categoryTextContainer}>
                                  <Text style={[styles.categoryName, { color: textColor }]}>
                                    {cat.nombre}
                                  </Text>
                                  <Text style={[styles.categoryDescription, { color: textColor }]}>
                                    {cat.descripcion}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )
                    ) : (item as any).isCameraRequest ? (
                      // Contenido especial para solicitud de cámaras
                      <View style={styles.cameraRequestContent}>
                        <Text style={[styles.cameraRequestTitle, { color: textColor }]}>
                          Para solicitar cámaras en la Municipalidad de San Bernardo
                        </Text>
                        
                        <View style={styles.requirementsList}>
                          <View style={styles.requirementItem}>
                            <View style={styles.requirementBullet}>
                              <IconSymbol name="check-circle" size={20} color="#0A4A90" />
                            </View>
                            <Text style={[styles.requirementText, { color: textColor }]}>
                              Identifica la ubicación exacta donde necesitas la cámara
                            </Text>
                          </View>
                          
                          <View style={styles.requirementItem}>
                            <View style={styles.requirementBullet}>
                              <IconSymbol name="check-circle" size={20} color="#0A4A90" />
                            </View>
                            <Text style={[styles.requirementText, { color: textColor }]}>
                              Describe el motivo de tu solicitud (problemas de seguridad, incidentes frecuentes, etc.)
                            </Text>
                          </View>
                          
                          <View style={styles.requirementItem}>
                            <View style={styles.requirementBullet}>
                              <IconSymbol name="check-circle" size={20} color="#0A4A90" />
                            </View>
                            <Text style={[styles.requirementText, { color: textColor }]}>
                              Proporciona tus datos de contacto para seguimiento
                            </Text>
                          </View>
                          
                          <View style={styles.requirementItem}>
                            <View style={styles.requirementBullet}>
                              <IconSymbol name="check-circle" size={20} color="#0A4A90" />
                            </View>
                            <Text style={[styles.requirementText, { color: textColor }]}>
                              Completa el formulario oficial de solicitud
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity 
                          style={styles.cameraRequestButton}
                          onPress={() => {
                            setShowCameraModal(true);
                          }}
                        >
                          <IconSymbol name="camera" size={20} color="#FFFFFF" />
                          <Text style={styles.cameraRequestButtonText}>
                            Ir al Formulario
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      // Contenido normal para otras preguntas
                      <Text style={[styles.collapseAnswer, { color: textColor }]}>
                        {item.answer}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Sección de redes sociales */}
          <FollowSection />
        </ScrollView>
      </View>

      {/* Modal de solicitud de cámaras */}
      <CameraRequestModal 
        visible={showCameraModal}
        onClose={() => setShowCameraModal(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    left: 16,
    top: 16,
    padding: 8,
    zIndex: 10,
  },
  logo: {
    width: 200,
    height: 80,
    marginTop: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  blueLine: {
    width: 60,
    height: 4,
    backgroundColor: '#0A4A90',
    borderRadius: 2,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    lineHeight: 28,
  },
  infoImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
  collapseContainer: {
    gap: 12,
    marginBottom: 24,
  },
  collapseItem: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  collapseQuestion: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    paddingRight: 12,
    lineHeight: 22,
  },
  collapseContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  collapseAnswer: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.85,
  },
  categoriesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  categoriesLoadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  categoriesList: {
    gap: 0,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  categoryIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  categoryTextContainer: {
    flex: 1,
    gap: 4,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  categoryDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.75,
  },
  cameraRequestContent: {
    gap: 16,
  },
  cameraRequestTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 4,
  },
  requirementsList: {
    gap: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  requirementBullet: {
    marginTop: 2,
  },
  requirementText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.85,
  },
  cameraRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A4A90',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    shadowColor: '#0A4A90',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraRequestButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
