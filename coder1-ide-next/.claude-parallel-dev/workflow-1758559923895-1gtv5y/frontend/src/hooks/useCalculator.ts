import { useState, useCallback, useEffect } from 'react';
import { CalculatorState, Operation } from '../types/calculator';
import { performCalculation, isValidNumber } from '../utils/calculator';

const initialState: CalculatorState = {
  display: '0',
  previousValue: '',
  operation: null,
  waitingForNewValue: false,
  history: []
};

export const useCalculator = () => {
  const [state, setState] = useState<CalculatorState>(initialState);

  const addToHistory = useCallback((entry: string) => {
    setState(prev => ({
      ...prev,
      history: [...prev.history.slice(-9), entry] // Keep last 10 entries
    }));
  }, []);

  const inputNumber = useCallback((num: string) => {
    setState(prev => {
      if (prev.waitingForNewValue) {
        return {
          ...prev,
          display: num,
          waitingForNewValue: false
        };
      }

      const newDisplay = prev.display === '0' ? num : prev.display + num;
      
      // Prevent numbers that are too long
      if (newDisplay.length > 15) {
        return prev;
      }

      return {
        ...prev,
        display: newDisplay
      };
    });
  }, []);

  const inputDecimal = useCallback(() => {
    setState(prev => {
      if (prev.waitingForNewValue) {
        return {
          ...prev,
          display: '0.',
          waitingForNewValue: false
        };
      }

      if (prev.display.includes('.')) {
        return prev;
      }

      return {
        ...prev,
        display: prev.display + '.'
      };
    });
  }, []);

  const inputOperation = useCallback((operation: Operation) => {
    setState(prev => {
      if (prev.previousValue && prev.operation && !prev.waitingForNewValue) {
        try {
          const result = performCalculation(prev.previousValue, prev.display, prev.operation);
          const historyEntry = `${prev.previousValue} ${prev.operation} ${prev.display} = ${result}`;
          addToHistory(historyEntry);
          
          return {
            ...prev,
            display: result,
            previousValue: result,
            operation,
            waitingForNewValue: true
          };
        } catch (error) {
          return {
            ...prev,
            display: 'Error',
            previousValue: '',
            operation: null,
            waitingForNewValue: true
          };
        }
      }

      return {
        ...prev,
        previousValue: prev.display,
        operation,
        waitingForNewValue: true
      };
    });
  }, [addToHistory]);

  const calculate = useCallback(() => {
    setState(prev => {
      if (!prev.previousValue || !prev.operation) {
        return prev;
      }

      try {
        const result = performCalculation(prev.previousValue, prev.display, prev.operation);
        const historyEntry = `${prev.previousValue} ${prev.operation} ${prev.display} = ${result}`;
        addToHistory(historyEntry);

        return {
          ...prev,
          display: result,
          previousValue: '',
          operation: null,
          waitingForNewValue: true
        };
      } catch (error) {
        return {
          ...prev,
          display: 'Error',
          previousValue: '',
          operation: null,
          waitingForNewValue: true
        };
      }
    });
  }, [addToHistory]);

  const clear = useCallback(() => {
    setState(initialState);
  }, []);

  const clearEntry = useCallback(() => {
    setState(prev => ({
      ...prev,
      display: '0'
    }));
  }, []);

  const backspace = useCallback(() => {
    setState(prev => {
      if (prev.display.length === 1 || prev.display === 'Error') {
        return {
          ...prev,
          display: '0'
        };
      }

      return {
        ...prev,
        display: prev.display.slice(0, -1)
      };
    });
  }, []);

  const toggleSign = useCallback(() => {
    setState(prev => {
      if (prev.display === '0' || prev.display === 'Error') {
        return prev;
      }

      const newDisplay = prev.display.startsWith('-')
        ? prev.display.slice(1)
        : '-' + prev.display;

      return {
        ...prev,
        display: newDisplay
      };
    });
  }, []);

  // Keyboard support
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const { key } = event;

      // Prevent default behavior for calculator keys
      if (/[\d+\-*/=.cC]/.test(key) || key === 'Enter' || key === 'Backspace' || key === 'Escape') {
        event.preventDefault();
      }

      // Numbers
      if (/\d/.test(key)) {
        inputNumber(key);
      }
      // Operations
      else if (['+', '-', '*', '/'].includes(key)) {
        inputOperation(key as Operation);
      }
      // Equals
      else if (key === '=' || key === 'Enter') {
        calculate();
      }
      // Decimal
      else if (key === '.') {
        inputDecimal();
      }
      // Clear
      else if (key === 'c' || key === 'C' || key === 'Escape') {
        clear();
      }
      // Backspace
      else if (key === 'Backspace') {
        backspace();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [inputNumber, inputOperation, calculate, inputDecimal, clear, backspace]);

  return {
    state,
    inputNumber,
    inputOperation,
    calculate,
    clear,
    clearEntry,
    backspace,
    inputDecimal,
    toggleSign
  };
};