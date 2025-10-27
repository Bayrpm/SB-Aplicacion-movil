import { Knewave_400Regular, useFonts } from '@expo-google-fonts/knewave';
import * as SplashScreenExpo from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Image, Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
	const [fontsLoaded] = useFonts({ Knewave_400Regular });

	// Evitar que la splash nativa se oculte hasta que terminemos la animación
	useEffect(() => {
		SplashScreenExpo.preventAutoHideAsync().catch(() => {});
	}, []);

	// Responsive measurements
	const safeTop = height * 0.06;
	const marginX = width * 0.08;
	let titleFont = height * 0.065;
	const titleBaseline = height * 0.17;
	const maxAllowedWidth = width * 0.95;
	const estimatedTextWidth = titleFont * 6;
	if (estimatedTextWidth > maxAllowedWidth) {
		titleFont = Math.max(height * 0.15, maxAllowedWidth / 6);
	}
	const titleTop = Math.max(safeTop, titleBaseline - titleFont * 0.6);

	// SVG path for top blue shape
	const azulSuperiorPath = () => {
		const x1 = width;
		const y1 = height * 0.28 * 0.735;
		const x2 = 0;
		const y2 = height * 0.66 * 0.735;
		const rx = 1.55 * width;
		const ry = 0.42 * height * 1.1;
		const rotation = -28;
		let d = `M 0 0`;
		d += ` L ${width} 0`;
		d += ` L ${x1} ${y1}`;
		d += ` A ${rx} ${ry} ${rotation} 0 1 ${x2} ${y2}`;
		d += ` L 0 0`;
		d += ` Z`;
		return d;
	};

	// Bottom text position
	const txtH = 0.05 * height;
	const centerY = 0.855 * height;
	const bottomTextTop = centerY - txtH * 0.5;

	// Animation refs
	const titleAnim = useRef(new Animated.Value(0)).current;
	// photoAnim removed: image should be static (no animation)
	const bottomPulse = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		if (!fontsLoaded) return;

		const entrance = Animated.sequence([
			Animated.timing(titleAnim, {
				toValue: 1,
				duration: 600,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
					Animated.sequence([Animated.delay(80)]),
		]);

		entrance.start(() => {
			// Hide the native splash when the entrance animation finishes.
			// This restores the original behavior where the native splash
			// is dismissed only after our RN entrance animation completes.
			SplashScreenExpo.hideAsync().catch(() => {});

			const loop = Animated.loop(
				Animated.sequence([
					Animated.timing(bottomPulse, { toValue: 0.4, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
					Animated.timing(bottomPulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				])
			);
			loop.start();
		});

		return () => {
			titleAnim.stopAnimation();
			bottomPulse.stopAnimation();
		};
		}, [fontsLoaded, titleAnim, bottomPulse]);

	return (
		<View style={styles.container}>
			<Svg style={styles.topSection} width={width} height={height}>
				<Path d={azulSuperiorPath()} fill="#6FB0DF" />
			</Svg>

			{fontsLoaded && (
				<Animated.Text
					style={[
						styles.bienvenidoText,
						{
							top: titleTop,
							fontSize: titleFont,
							paddingHorizontal: marginX,
							opacity: titleAnim,
							transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
						},
					]}
				>
					Bienvenido
				</Animated.Text>
			)}

					<Image source={require('@/assets/images/delh.jpg')} style={styles.photoLayer} resizeMode="cover" />

			<Svg style={styles.bottomBand} width={width + 2} height={height}>
				<Path d={`M 0 ${height * (0.76 + (1 - 0.76) * 0.2)} L ${width + 1} ${height * (0.68 + (1 - 0.68) * 0.2)} L ${width + 1} ${height} L 0 ${height} Z`} fill="#0A4A90" />
			</Svg>

			{fontsLoaded && (
				<Animated.Text style={[styles.comencemosText, { top: bottomTextTop, fontSize: txtH, opacity: bottomPulse }]}>
					Comencemos
				</Animated.Text>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#FEFEFE' },
	topSection: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 },
	bienvenidoText: {
		position: 'absolute',
		fontWeight: '400',
		letterSpacing: width * 0.002,
		color: '#FFFFFF',
		textAlign: 'center',
		zIndex: 4,
		fontFamily: 'Knewave_400Regular',
		width: '100%',
	},
	photoLayer: {
		position: 'absolute',
		top: height * 0.4,
		left: 0,
		right: 0,
		width: '100%',
		height: height * 0.41,
		zIndex: 1,
	},
	bottomBand: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3 },
	comencemosText: {
		position: 'absolute',
		fontWeight: 'bold',
		color: '#FFFFFF',
		textAlign: 'center',
		letterSpacing: width * 0.0006,
		paddingLeft: width * 0.3,
		fontFamily: Platform.OS === 'ios' ? 'Nunito-Bold' : Platform.OS === 'android' ? 'Nunito-Bold' : 'Quicksand-Bold',
		zIndex: 5,
		width: '100%',
	},
});

export default SplashScreen;

