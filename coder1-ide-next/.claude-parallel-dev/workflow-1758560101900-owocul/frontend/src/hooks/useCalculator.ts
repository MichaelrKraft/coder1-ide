import { useReducer, useCallback } from 'react';
import { CalculatorState, CalculatorAction, Operation } from '../types/calculator';
import { performCalculation, formatNumber, isValidNumber } from '../utils/calculations';

const initialState: CalculatorState = {
  display: '0',
  previousValue: null,
  operation: null,
  waitingForNewValue: false,
  memory: 0,
};

const calculatorReducer = (state: CalculatorState, action: CalculatorAction): CalculatorState => {
  switch (action.type) {
    case 'INPUT_NUMBER': {
      const { payload: number } = action;
      
      if (state.waitingForNewValue) {
        return {
          ...state,
          display: number,
          waitingForNewValue: false,
        };
      }
      
      return {
        ...state,
        display: state.display === '0' ? number : state.display + number,
      };
    }
    
    case 'INPUT_DECIMAL': {
      if (state.waitingForNewValue) {
        return {
          ...state,
          display: '0.',
          waitingForNewValue: false,
        };
      }
      
      if (state.display.includes('.')) {
        return state;
      }
      
      return {
        ...state,
        display: state.display + '.',
      };
    }
    
    case 'INPUT_OPERATION': {
      const { payload: operation } = action;
      const inputValue = parseFloat(state.display);
      
      if (state.previousValue === null) {
        return {
          ...state,
          previousValue: inputValue,
          operation,
          waitingForNewValue: true,
        };
      }
      
      if (state.operation && !state.waitingForNewValue) {
        try {
          const result = performCalculation(state.previousValue, inputValue, state.operation);
          return {
            ...state,
            display: formatNumber(result),
            previousValue: result,
            operation,
            waitingForNewValue: true,
          };
        } catch (error) {
          return {
            ...initialState,
            display: 'Error',
          };
        }
      }
      
      return {
        ...state,
        operation,
        waitingForNewValue: true,
      };
    }
    
    case 'CALCULATE': {
      if (state.operation && state.previousValue !== null && !state.waitingForNewValue) {
        try {
          const inputValue = parseFloat(state.display);
          const result = performCalculation(state.previousValue, inputValue, state.operation);
          return {
            ...state,
            display: formatNumber(result),
            previousValue: null,
            operation: null,
            waitingForNewValue: true,
          };
        } catch (error) {
          return {
            ...initialState,
            display: 'Error',
          };
        }
      }
      return state;
    }
    
    case 'CLEAR_ALL': {
      return initialState;
    }
    
    case 'CLEAR_ENTRY': {
      return {
        ...state,
        display: '0',
      };
    }
    
    case 'MEMORY_ADD': {
      const currentValue = parseFloat(state.display);
      return {
        ...state,
        memory: state.memory + currentValue,
      };
    }
    
    case 'MEMORY_SUBTRACT': {
      const currentValue = parseFloat(state.display);
      return {
        ...state,
        memory: state.memory - currentValue,
      };
    }
    
    case 'MEMORY_RECALL': {
      return {
        ...state,
        display: formatNumber(state.memory),
        waitingForNewValue: true,
      };
    }
    
    case 'MEMORY_CLEAR': {
      return {
        ...state,
        memory: 0,
      };
    }
    
    default:
      return state;
  }
};

export const useCalculator = () => {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  
  const inputNumber = useCallback((number: string) => {
    dispatch({ type: 'INPUT_NUMBER', payload: number });
  }, []);
  
  const inputOperation = useCallback((operation: Operation) => {
    dispatch({ type: 'INPUT_OPERATION', payload: operation });
  }, []);
  
  const calculate = useCallback(() => {
    dispatch({ type: 'CALCULATE' });
  }, []);
  
  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);
  
  const clearEntry = useCallback(() => {
    dispatch({ type: 'CLEAR_ENTRY' });
  }, []);
  
  const inputDecimal = useCallback(() => {
    dispatch({ type: 'INPUT_DECIMAL' });
  }, []);
  
  const memoryAdd = useCallback(() => {
    dispatch({ type: 'MEMORY_ADD' });
  }, []);
  
  const memorySubtract = useCallback(() => {
    dispatch({ type: 'MEMORY_SUBTRACT' });
  }, []);
  
  const memoryRecall = useCallback(() => {
    dispatch({ type: 'MEMORY_RECALL' });
  }, []);
  
  const memoryClear = useCallback(() => {
    dispatch({ type: 'MEMORY_CLEAR' });
  }, []);
  
  return {
    state,
    inputNumber,
    inputOperation,
    calculate,
    clearAll,
    clearEntry,
    inputDecimal,
    memoryAdd,
    memorySubtract,
    memoryRecall,
    memoryClear,
  };
};