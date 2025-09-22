import React from 'react';
import { Display } from '../Display/Display';
import { ButtonGrid } from '../ButtonGrid/ButtonGrid';
import { useCalculator } from '../../hooks/useCalculator';
import { useKeyboard } from '../../hooks/useKeyboard';
import styles from './Calculator.module.css';

interface CalculatorProps {
  className?: string;
}

export const Calculator: React.FC<CalculatorProps> = ({ className }) => {
  const { display, currentOperation, handleButtonPress } = useCalculator();
  
  // Enable keyboard support
  useKeyboard({ onButtonPress: handleButtonPress });

  return (
    <div className={`${styles.calculator} ${className || ''}`} tabIndex={0}>
      <Display value={display} />
      <ButtonGrid 
        onButtonPress={handleButtonPress}
        currentOperation={currentOperation}
      />
    </div>
  );
};

export default Calculator;