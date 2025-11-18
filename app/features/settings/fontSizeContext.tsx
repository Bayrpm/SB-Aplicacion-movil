import React, { createContext, ReactNode, useContext, useState } from 'react';

type FontSize = 'small' | 'medium' | 'large';

interface FontSizeContextProps {
	fontSize: FontSize;
	setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextProps | undefined>(undefined);

export const FontSizeProvider = ({ children }: { children: ReactNode }) => {
	const [fontSize, setFontSize] = useState<FontSize>('medium');
	return (
		<FontSizeContext.Provider value={{ fontSize, setFontSize }}>
			{children}
		</FontSizeContext.Provider>
	);
};

export function useFontSize() {
	const context = useContext(FontSizeContext);
	if (!context) {
		throw new Error('useFontSize debe usarse dentro de FontSizeProvider');
	}
	return context;
}

// Export default para silenciar el warning de Expo Router
export default function FontSizeContextPlaceholder() { return null; }
