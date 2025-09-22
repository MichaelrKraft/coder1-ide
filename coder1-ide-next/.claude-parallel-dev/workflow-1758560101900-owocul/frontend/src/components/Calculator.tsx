import React, { useEffect, useCallback } from 'react';
import { useCalculator } from '../hooks/useCalculator';
import { Button } from './Button';
import { Display } from './Display';

export const Calculator: React.FC = () => {
  const {
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
  } = useCalculator();

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    const { key } = event;
    
    // Prevent default for calculator keys
    if (/[0-9+\-*/=.cC]/.test(key) || key === 'Enter' || key === 'Escape' || key === 'Backspace') {
      event.preventDefault();
    }
    
    // Number inputs
    if (/[0-9]/.test(key)) {
      inputNumber(key);
    }
    
    // Operations
    switch (key) {
      case '+':
        inputOperation('+');
        break;
      case '-':
        inputOperation('-');
        break;
      case '*':
        inputOperation('*');
        break;
      case '/':
        inputOperation('/');
        break;
      case '=':
      case 'Enter':
        calculate();
        break;
      case '.':
        inputDecimal();
        break;
      case 'c':
      case 'C':
        clearEntry();
        break;
      case 'Escape':
        clearAll();
        break;
      case 'Backspace':
        clearEntry();
        break;
    }
  }, [inputNumber, inputOperation, calculate, inputDecimal, clearEntry, clearAll]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  return (
    <div className="calculator" role="application" aria-label="Calculator">
      <Display value={state.display} hasMemory={state.memory !== 0} />
      
      <div className="calculator-buttons">
        {/* Memory and Clear Row */}
        <Button 
          onClick={memoryClear} 
          className="memory-button"
          aria-label="Memory Clear"
        >
          MC
        </Button>
        <Button 
          onClick={memoryRecall} 
          className="memory-button"
          aria-label="Memory Recall"
        >
          MR
        </Button>
        <Button 
          onClick={memoryAdd} 
          className="memory-button"
          aria-label="Memory Add"
        >
          M+
        </Button>
        <Button 
          onClick={memorySubtract} 
          className="memory-button"
          aria-label="Memory Subtract"
        >
          M-
        </Button>
        
        {/* Clear Row */}
        <Button 
          onClick={clearAll} 
          className="clear-button"
          aria-label="Clear All"
        >
          AC
        </Button>
        <Button 
          onClick={clearEntry} 
          className="clear-button"
          aria-label="Clear Entry"
        >
          CE
        </Button>
        <Button 
          onClick={() => inputOperation('/')} 
          className="operation-button"
          aria-label="Divide"
        >
          ÷
        </Button>
        <Button 
          onClick={() => inputOperation('*')} 
          className="operation-button"
          aria-label="Multiply"
        >
          ×
        </Button>
        
        {/* Number Row 1 */}
        <Button 
          onClick={() => inputNumber('7')} 
          className="number-button"
          aria-label="Seven"
        >
          7
        </Button>
        <Button 
          onClick={() => inputNumber('8')} 
          className="number-button"
          aria-label="Eight"
        >
          8
        </Button>
        <Button 
          onClick={() => inputNumber('9')} 
          className="number-button"
          aria-label="Nine"
        >
          9
        </Button>
        <Button 
          onClick={() => inputOperation('-')} 
          className="operation-button"
          aria-label="Subtract"
        >
          −
        </Button>
        
        {/* Number Row 2 */}
        <Button 
          onClick={() => inputNumber('4')} 
          className="number-button"
          aria-label="Four"
        >
          4
        </Button>
        <Button 
          onClick={() => inputNumber('5')} 
          className="number-button"
          aria-label="Five"
        >
          5
        </Button>
        <Button 
          onClick={() => inputNumber('6')} 
          className="number-button"
          aria-label="Six"
        >
          6
        </Button>
        <Button 
          onClick={() => inputOperation('+')} 
          className="operation-button"
          aria-label="Add"
        >
          +
        </Button>
        
        {/* Number Row 3 */}
        <Button 
          onClick={() => inputNumber('1')} 
          className="number-button"
          aria-label="One"
        >
          1
        </Button>
        <Button 
          onClick={() => inputNumber('2')} 
          className="number-button"
          aria-label="Two"
        >
          2
        </Button>
        <Button 
          onClick={() => inputNumber('3')} 
          className="number-button"
          aria-label="Three"
        >
          3
        </Button>
        <Button 
          onClick={calculate} 
          className="equals-button"
          aria-label="Equals"
        >
          =
        </Button>
        
        {/* Bottom Row */}
        <Button 
          onClick={() => inputNumber('0')} 
          className="number-button zero-button"
          aria-label="Zero"
        >
          0
        </Button>
        <Button 
          onClick={inputDecimal} 
          className="number-button"
          aria-label="Decimal point"
        >
          .
        </Button>
      </div>
    </div>
  );
};