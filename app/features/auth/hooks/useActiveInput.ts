import React from 'react';

export function useActiveInput() {
  const [activeInput, setActiveInput] = React.useState<string | null>(null);

  // Configurar funciones globales para comunicación con componentes de input
  React.useEffect(() => {
    (global as any).handleInputFocus = (inputName: string) => {
      // focus received
      setActiveInput(inputName);
    };
    
    (global as any).handleInputBlur = () => {
      // blur received
      setActiveInput(null);
    };

    // Cleanup
    return () => {
      delete (global as any).handleInputFocus;
      delete (global as any).handleInputBlur;
    };
  }, []);

  return {
    activeInput,
    setActiveInput,
  };
}