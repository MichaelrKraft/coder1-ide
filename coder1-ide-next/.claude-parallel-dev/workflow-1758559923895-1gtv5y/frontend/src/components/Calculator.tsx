import React from 'react';
import { Display } from './Display';
import { ButtonGrid } from './ButtonGrid';
import { CompactThemeToggle } from './ThemeToggle';
import { useCalculator } from '../hooks/useCalculator';
import { getOperationSymbol } from '../utils/calculator';

export const Calculator: React.FC = () => {
  const {
    state,
    inputNumber,
    inputOperation,
    calculate,
    clear,
    clearEntry,
    backspace,
    inputDecimal,
    toggleSign
  } = useCalculator();

  return (
    <div className="calculator" role="application" aria-label="Calculator">
      <div className="calculator-container">
        <header className="calculator-header">
          <div className="header-content">
            <h1 className="calculator-title">Calculator</h1>
            <CompactThemeToggle />
          </div>
        </header>
        
        <Display
          value={state.display}
          operation={state.operation ? getOperationSymbol(state.operation) : null}
          previousValue={state.previousValue}
        />
        
        <ButtonGrid
          onNumberClick={inputNumber}
          onOperationClick={inputOperation}
          onEqualsClick={calculate}
          onClearClick={clear}
          onClearEntryClick={clearEntry}
          onBackspaceClick={backspace}
          onDecimalClick={inputDecimal}
          onToggleSignClick={toggleSign}
        />
        
        {state.history.length > 0 && (
          <div className="calculator-history">
            <h3 className="history-title">History</h3>
            <div className="history-list">
              {state.history.slice(-3).map((entry, index) => (
                <div key={index} className="history-entry">
                  {entry}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <footer className="calculator-footer">
          <p className="keyboard-hint">
            💡 Tip: Use your keyboard for input (numbers, +, -, *, /, =, Enter, C, Backspace)
          </p>
        </footer>
      </div>
    </div>
  );
};