import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmergencyCarousel from '@/app/features/homeCitizen/components/emergencyCarousel';
import FollowSection from '@/app/features/homeCitizen/components/followSection';
import HomeCard from '@/app/features/homeCitizen/components/homeCard';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function CitizenHome() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const logoSource = scheme === 'dark'
    ? require('@/assets/images/img_logo_blanco.png')
    : require('@/assets/images/img_logo.png');

  // Texto para la card. Separado en título y descripción para destacar el principal.
  const cardTitle = 'Tú voz importa, denuncia y apoya a tu comunidad.';
  const cardDescription = 'Juntos construimos un San Bernardo más seguro. Cada denuncia cuenta para mejorar nuestros barrios.';

  // Calcular alturas en función del logo para evitar huecos grandes
  const LOGO_HEIGHT = 88;
  const headerWrapperHeight = LOGO_HEIGHT + Math.max(8, Math.round(insets.top * 0.6));

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ dark: '#000000ff', light: '#ffffff' }}
      headerHeight={headerWrapperHeight}
      headerImage={
        <View style={{ height: headerWrapperHeight, justifyContent: 'flex-start', alignItems: 'center', paddingTop: Math.max(6, Math.round(insets.top * 0.6)) }}>
          <Image source={logoSource} style={[styles.logo, { height: LOGO_HEIGHT }]} contentFit="contain" />
        </View>
      }
    >
  <View style={[styles.container, { backgroundColor: scheme === 'dark' ? '#000000ff' : '#fff', paddingBottom: insets.bottom + 64 }]}> 
        {/* Logo + HomeCard ahora forman parte del scroll (arriba) */}
        <View style={{ alignItems: 'center', width: '100%' }}>
          <View style={{ width: '100%', marginTop: 4 }}>
            <HomeCard title={cardTitle} description={cardDescription} buttonText="Conoce más" onPress={() => { /* abrir info */ }} />
          </View>
        </View>

        {/* Sección: Números de emergencia */}
        <View style={{ marginTop: 8, width: '100%' }}>
          <ThemedText style={styles.sectionTitle}>Números de emergencia</ThemedText>
          <EmergencyCarousel items={[
            { id: 'seguridad', number: '800202840' },
            { id: 'carabineros', number: '133' },
            { id: 'samu', number: '131' },
            { id: 'bomberos', number: '132' },
            { id: 'pdi', number: '134' },
          ]} />
        </View>

        {/* Sección: Síguenos */}
        <FollowSection />
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 8,
  },
  logo: {
    width: 220,
    height: 96,
    alignSelf: 'center',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
});
