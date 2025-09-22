import { useEffect } from 'react';

interface UseKeyboardProps {
  onButtonPress: (value: string, type: string) => void;
}

export const useKeyboard = ({ onButtonPress }: UseKeyboardProps) => {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const { key } = event;
      
      // Prevent default behavior for calculator keys
      if (/[0-9+\-*/.=]/.test(key) || key === 'Enter' || key === 'Escape' || key === 'Backspace') {
        event.preventDefault();
      }

      // Handle number keys
      if (/[0-9]/.test(key)) {
        onButtonPress(key, 'number');
        return;
      }

      // Handle operation keys
      switch (key) {
        case '+':
          onButtonPress('+', 'operation');
          break;
        case '-':
          onButtonPress('-', 'operation');
          break;
        case '*':
          onButtonPress('*', 'operation');
          break;
        case '/':
          onButtonPress('/', 'operation');
          break;
        case '.':
          onButtonPress('.', 'decimal');
          break;
        case '=':
        case 'Enter':
          onButtonPress('=', 'equals');
          break;
        case 'Escape':
        case 'c':
        case 'C':
          onButtonPress('clear', 'clear');
          break;
        case '%':
          onButtonPress('%', 'operation');
          break;
        case 'Backspace':
          // Handle backspace as a special case - could implement digit deletion
          onButtonPress('clear', 'clear');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [onButtonPress]);
};