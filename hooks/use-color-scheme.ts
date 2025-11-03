import { useAppColorScheme } from './useAppColorScheme';
export const useColorScheme = () => {
	const [colorScheme] = useAppColorScheme();
	return colorScheme;
};
