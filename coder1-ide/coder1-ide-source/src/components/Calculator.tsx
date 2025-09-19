import React, { useState } from 'react';
import { Vortex } from './ui/vortex';

const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [waitingForInput, setWaitingForInput] = useState(false);

  const updateDisplay = (value: string) => {
    setDisplay(value);
  };

  const appendToDisplay = (value: string) => {
    if (waitingForInput) {
      setDisplay('');
      setWaitingForInput(false);
    }

    if (display === '0' && value !== '.') {
      updateDisplay(value);
    } else {
      updateDisplay(display + value);
    }
  };

  const clearDisplay = () => {
    updateDisplay('0');
    setWaitingForInput(false);
  };

  const deleteLast = () => {
    if (display.length > 1) {
      updateDisplay(display.slice(0, -1));
    } else {
      updateDisplay('0');
    }
  };

  const calculate = () => {
    try {
      let expression = display;
      
      // Replace display symbols with actual operators
      expression = expression.replace(/×/g, '*');
      expression = expression.replace(/÷/g, '/');
      expression = expression.replace(/−/g, '-');
      
      // Evaluate the expression
      const result = eval(expression);
      
      // Handle division by zero
      if (!isFinite(result)) {
        updateDisplay('Error');
      } else {
        updateDisplay(result.toString());
      }
      
      setWaitingForInput(true);
    } catch (error) {
      updateDisplay('Error');
      setWaitingForInput(true);
    }
  };

  // Keyboard support
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      
      if (key >= '0' && key <= '9') {
        appendToDisplay(key);
      } else if (key === '.') {
        appendToDisplay('.');
      } else if (key === '+') {
        appendToDisplay('+');
      } else if (key === '-') {
        appendToDisplay('-');
      } else if (key === '*') {
        appendToDisplay('*');
      } else if (key === '/') {
        event.preventDefault();
        appendToDisplay('/');
      } else if (key === 'Enter' || key === '=') {
        calculate();
      } else if (key === 'Escape' || key === 'c' || key === 'C') {
        clearDisplay();
      } else if (key === 'Backspace') {
        deleteLast();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, waitingForInput]);

  return (
    <div className="w-full h-screen">
      <Vortex
        backgroundColor="#1a1a1a"
        rangeY={800}
        particleCount={500}
        baseHue={220}
        className="flex items-center justify-center px-4 py-4 w-full h-full"
      >
        <div className="calculator bg-gradient-to-b from-gray-800 to-gray-900 p-6 rounded-2xl shadow-2xl max-w-sm w-full border-2 border-gray-700 relative">
          {/* Solar panel */}
          <div className="solar-panel w-16 h-4 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 mx-auto mb-3 rounded border border-gray-600 relative">
            <div className="absolute top-0.5 left-0.5 right-0.5 h-0.5 bg-gray-600 rounded"></div>
          </div>
          
          {/* Display */}
          <div className="mb-5">
            <input
              type="text"
              className="w-full h-16 text-3xl font-mono font-bold text-right px-4 bg-black text-green-400 rounded-lg border-2 border-gray-800 shadow-inner outline-none"
              style={{ 
                textShadow: '0 0 10px #00ff41',
                fontFamily: 'Orbitron, monospace'
              }}
              value={display}
              readOnly
            />
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-4 gap-3">
            {/* Row 1 */}
            <button 
              className="btn-clear h-12 bg-gradient-to-b from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold rounded-lg shadow-lg border-t border-gray-500 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={clearDisplay}
            >
              C
            </button>
            <button 
              className="btn-operator h-12 bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold rounded-lg shadow-lg border-t border-orange-400 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={() => appendToDisplay('/')}
            >
              ÷
            </button>
            <button 
              className="btn-operator h-12 bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold rounded-lg shadow-lg border-t border-orange-400 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={() => appendToDisplay('*')}
            >
              ×
            </button>
            <button 
              className="btn-operator h-12 bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold rounded-lg shadow-lg border-t border-orange-400 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={deleteLast}
            >
              ⌫
            </button>

            {/* Row 2 */}
            <button 
              className="btn-number h-12 bg-gradient-to-b from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white font-bold rounded-lg shadow-lg border-t border-gray-400 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={() => appendToDisplay('7')}
            >
              7
            </button>
            <button 
              className="btn-number h-12 bg-gradient-to-b from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white font-bold rounded-lg shadow-lg border-t border-gray-400 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={() => appendToDisplay('8')}
            >
              8
            </button>
            <button 
              className="btn-number h-12 bg-gradient-to-b from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white font-bold rounded-lg shadow-lg border-t border-gray-400 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={() => appendToDisplay('9')}
            >
              9
            </button>
            <button 
              className="btn-operator h-12 bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold rounded-lg shadow-lg border-t border-orange-400 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={() => appendToDisplay('-')}
            >
              −
            </button>

            {/* Row 3 */}
            <button 
              className="btn-number h-12 bg-gradient-to-b from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white font-bold rounded-lg shadow-lg border-t border-gray-400 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={() => appendToDisplay('4')}
            >
              4
            </button>
            <button 
              className="btn-number h-12 bg-gradient-to-b from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white font-bold rounded-lg shadow-lg border-t border-gray-400 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={() => appendToDisplay('5')}
            >
              5
            </button>
            <button 
              className="btn-number h-12 bg-gradient-to-b from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white font-bold rounded-lg shadow-lg border-t border-gray-400 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={() => appendToDisplay('6')}
            >
              6
            </button>
            <button 
              className="btn-operator h-12 bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold rounded-lg shadow-lg border-t border-orange-400 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={() => appendToDisplay('+')}
            >
              +
            </button>

            {/* Row 4 */}
            <button 
              className="btn-number h-12 bg-gradient-to-b from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white font-bold rounded-lg shadow-lg border-t border-gray-400 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={() => appendToDisplay('1')}
            >
              1
            </button>
            <button 
              className="btn-number h-12 bg-gradient-to-b from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white font-bold rounded-lg shadow-lg border-t border-gray-400 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={() => appendToDisplay('2')}
            >
              2
            </button>
            <button 
              className="btn-number h-12 bg-gradient-to-b from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white font-bold rounded-lg shadow-lg border-t border-gray-400 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={() => appendToDisplay('3')}
            >
              3
            </button>
            <button 
              className="btn-equals h-24 bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold rounded-lg shadow-lg border-t border-orange-400 active:transform active:translate-y-0.5 transition-all duration-100 row-span-2"
              onClick={calculate}
            >
              =
            </button>

            {/* Row 5 */}
            <button 
              className="btn-number h-12 bg-gradient-to-b from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white font-bold rounded-lg shadow-lg border-t border-gray-400 active:transform active:translate-y-0.5 transition-all duration-100 col-span-2"
              onClick={() => appendToDisplay('0')}
            >
              0
            </button>
            <button 
              className="btn-number h-12 bg-gradient-to-b from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white font-bold rounded-lg shadow-lg border-t border-gray-400 active:transform active:translate-y-0.5 transition-all duration-100"
              onClick={() => appendToDisplay('.')}
            >
              .
            </button>
          </div>

          {/* Realistic calculator texture overlay */}
          <div className="absolute inset-0 pointer-events-none rounded-2xl" 
               style={{
                 background: `repeating-linear-gradient(
                   45deg,
                   transparent,
                   transparent 1px,
                   rgba(255, 255, 255, 0.02) 1px,
                   rgba(255, 255, 255, 0.02) 2px
                 )`
               }}>
          </div>
        </div>
      </Vortex>
    </div>
  );
};

export default Calculator;