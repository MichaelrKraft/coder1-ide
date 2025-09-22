import { useState, useCallback } from 'react';
import { CalculatorState, Operation } from '../types/calculator';
import { MAX_DISPLAY_LENGTH } from '../constants/calculator';

const initialState: CalculatorState = {
  display: '0',
  previousValue: null,
  currentOperation: null,
  waitingForNewValue: false,
};

export const useCalculator = () => {
  const [state, setState] = useState<CalculatorState>(initialState);

  const clear = useCallback(() => {
    setState(initialState);
  }, []);

  const inputNumber = useCallback((num: string) => {
    setState(prev => {
      // Clear error state when entering new number
      if (prev.display === 'Error') {
        return {
          ...initialState,
          display: num,
        };
      }

      if (prev.waitingForNewValue) {
        return {
          ...prev,
          display: num,
          waitingForNewValue: false,
        };
      }

      const newDisplay = prev.display === '0' ? num : prev.display + num;
      
      if (newDisplay.length > MAX_DISPLAY_LENGTH) {
        return prev;
      }

      return {
        ...prev,
        display: newDisplay,
      };
    });
  }, []);

  const inputDecimal = useCallback(() => {
    setState(prev => {
      if (prev.waitingForNewValue) {
        return {
          ...prev,
          display: '0.',
          waitingForNewValue: false,
        };
      }

      if (prev.display.includes('.')) {
        return prev;
      }

      return {
        ...prev,
        display: prev.display + '.',
      };
    });
  }, []);

  const performCalculation = useCallback((operation: Operation) => {
    setState(prev => {
      const currentValue = parseFloat(prev.display);

      if (prev.previousValue === null) {
        return {
          ...prev,
          previousValue: currentValue,
          currentOperation: operation,
          waitingForNewValue: true,
        };
      }

      if (prev.currentOperation && !prev.waitingForNewValue) {
        const prevValue = prev.previousValue;
        let result: number;

        switch (prev.currentOperation) {
          case '+':
            result = prevValue + currentValue;
            break;
          case '-':
            result = prevValue - currentValue;
            break;
          case '*':
            result = prevValue * currentValue;
            break;
          case '/':
            if (currentValue === 0) {
              return {
                display: 'Error',
                previousValue: null,
                currentOperation: null,
                waitingForNewValue: true,
              };
            }
            result = prevValue / currentValue;
            break;
          default:
            result = currentValue;
        }

        // Handle special cases
        if (!isFinite(result)) {
          return {
            display: 'Error',
            previousValue: null,
            currentOperation: null,
            waitingForNewValue: true,
          };
        }

        const displayResult = result.toString();
        const truncatedResult = displayResult.length > MAX_DISPLAY_LENGTH 
          ? parseFloat(result.toPrecision(MAX_DISPLAY_LENGTH - 2)).toString()
          : displayResult;

        return {
          display: truncatedResult,
          previousValue: operation === '=' ? null : result,
          currentOperation: operation === '=' ? null : operation,
          waitingForNewValue: true,
        };
      }

      return {
        ...prev,
        currentOperation: operation,
        waitingForNewValue: true,
      };
    });
  }, []);

  const toggleSign = useCallback(() => {
    setState(prev => {
      const value = parseFloat(prev.display);
      if (value === 0) return prev;
      
      return {
        ...prev,
        display: (-value).toString(),
      };
    });
  }, []);

  const percentage = useCallback(() => {
    setState(prev => {
      const value = parseFloat(prev.display);
      return {
        ...prev,
        display: (value / 100).toString(),
      };
    });
  }, []);

  const handleButtonPress = useCallback((value: string, type: string) => {
    switch (type) {
      case 'number':
        inputNumber(value);
        break;
      case 'operation':
        if (value === 'toggle-sign') {
          toggleSign();
        } else if (value === '%') {
          percentage();
        } else {
          performCalculation(value as Operation);
        }
        break;
      case 'equals':
        performCalculation('=');
        break;
      case 'decimal':
        inputDecimal();
        break;
      case 'clear':
        clear();
        break;
    }
  }, [inputNumber, inputDecimal, performCalculation, toggleSign, percentage, clear]);

  return {
    display: state.display,
    currentOperation: state.currentOperation,
    handleButtonPress,
    clear,
  };
};