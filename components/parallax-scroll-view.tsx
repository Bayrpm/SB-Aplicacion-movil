import type { PropsWithChildren, ReactElement } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, { Extrapolate, interpolate, useAnimatedRef, useAnimatedStyle, useScrollOffset } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

const DEFAULT_HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
  headerHeight?: number;
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
  headerHeight = DEFAULT_HEADER_HEIGHT,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const scrollBg = headerBackgroundColor?.[colorScheme] ?? useThemeColor({}, 'background');

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  // keep the hook in place if later we want animated header reactions
  const scrollOffset = useScrollOffset(scrollRef);
  const headerAnimatedStyle = useAnimatedStyle(() => {
    // Aplicar un parallax sutil: el header se desplaza hacia arriba a una
    // fracción del scroll (más lento que el contenido) y se escala levemente
    // al hacer pull-down (scroll negativo).
    const y = scrollOffset.value ?? 0;

    const translateY = interpolate(y, [0, headerHeight], [0, -Math.round(headerHeight * 0.25)], Extrapolate.CLAMP);
    const scale = interpolate(y, [-120, 0], [1.06, 1], Extrapolate.CLAMP);

    return {
      transform: [
        { translateY },
        { scale },
      ],
    };
  });

  const insets = useSafeAreaInsets();
  const { height: WINDOW_HEIGHT } = Dimensions.get('window');
  const topMaskHeight = Math.max(insets.top, 0);

  return (
    <ThemedView style={{ flex: 1 }} lightColor={headerBackgroundColor?.light} darkColor={headerBackgroundColor?.dark}>
      {/* Top mask: covers the system status bar area so content never shows through */}
      <Animated.View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: topMaskHeight, backgroundColor: scrollBg, zIndex: 1001, elevation: 12 }}
      />

      {/* The header is part of the ScrollView content so it scrolls with the page.
          The top mask remains fixed to hide any content that would appear in the
          system status bar area. */}
      <Animated.ScrollView
        ref={scrollRef}
        style={{ backgroundColor: scrollBg, flex: 1 }}
        contentInsetAdjustmentBehavior="never"
        // No extra top padding: the headerImage component should control its own top padding
        // Reducir paddingBottom para disminuir la distancia total de scroll
        contentContainerStyle={{ paddingTop: 0, paddingBottom: insets.bottom + Math.round(WINDOW_HEIGHT * 0.05) }}
        scrollEventThrottle={16}
      >
        {/* Header (logo) placed inside the ScrollView so it scrolls with content */}
        <Animated.View pointerEvents="box-none" style={[styles.header, { height: headerHeight }, headerAnimatedStyle]}>
          {headerImage}
        </Animated.View>

        <ThemedView style={styles.content} lightColor={headerBackgroundColor?.light} darkColor={headerBackgroundColor?.dark}>
          {children}
        </ThemedView>
      </Animated.ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    // height now provided via inline style from the headerHeight prop; keep a fallback
    height: DEFAULT_HEADER_HEIGHT,
    // Allow header children (logo + card) to overflow so card is fully visible
    overflow: 'visible',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
    overflow: 'hidden',
  },
});

