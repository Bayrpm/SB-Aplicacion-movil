import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, useColorScheme, View } from 'react-native'; // import { View } from 'react-native-reanimated/lib/typescript/Animated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MyCases from '@/app/features/homeInspector/components/myCasesComponent';
import ParallaxScrollView from '@/components/parallax-scroll-view';

export default function HomeScreen() {


  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? "light";
  const logoSource =
    scheme === "dark"
      ? require("@/assets/images/img_logo_blanco.png")
      : require("@/assets/images/img_logo.png");

  const LOGO_HEIGHT = 120;
  const headerWrapperHeight =
    LOGO_HEIGHT + Math.max(24, Math.round(insets.top * 0.8)) + 24;

  return ( //return de HomeScreen()

    <ParallaxScrollView
      // fondo pantalla principal
      headerBackgroundColor={{ light: '#ffffff', dark: '#000000ff' }}
      headerHeight={headerWrapperHeight}
      headerImage={
        <View
          style={{
            height: headerWrapperHeight,
            justifyContent: "flex-start",
            alignItems: "center",
            paddingTop: Math.max(48, Math.round(insets.top * 1.2)),
            paddingBottom: 24,
          }}
        >
          <Image
            source={logoSource}
            style={[styles.logo, { height: LOGO_HEIGHT, marginTop: 12 }]}
            contentFit="contain"
          />
        </View>
      } //cierre de header image

    > {/*cierre de  ParallaxScrollView */}
      <View style={styles.contenedor}>
        <Text style={styles.titulo} > Mis casos</Text>
      </View>

      {/* Mis Casos */}
      <View style={styles.container}>
        <MyCases
          title='Auto'
          description='dbabdbjaksbdkadcbkasbcjkasbcjkacskjbcasjkbcjkab10'
          timeAgo='hace media hora'
          address="calle color sur"
        />
      </View>

    </ParallaxScrollView>
  );
}


const styles = StyleSheet.create({
  contenedor: {
    width: '100%',
    marginTop: 20,
  },

  titulo: {
    fontSize: 24,
    textAlign: 'center',
    fontWeight: 'bold',
  },

  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },

  // propio
  logo: {
    width: 260,
    height: 120,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 12,
  },

  container: {
    gap: 8,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
  },
});

