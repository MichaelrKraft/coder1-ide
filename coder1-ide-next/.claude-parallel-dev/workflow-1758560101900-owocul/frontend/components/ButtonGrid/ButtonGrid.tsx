import React from 'react';
import { Button } from '../Button/Button';
import { ButtonConfig } from '../../types/calculator';
import { BUTTON_CONFIGS } from '../../constants/calculator';
import styles from './ButtonGrid.module.css';

interface ButtonGridProps {
  onButtonPress: (value: string, type: string) => void;
  currentOperation?: string | null;
}

export const ButtonGrid: React.FC<ButtonGridProps> = ({ 
  onButtonPress, 
  currentOperation 
}) => {
  return (
    <div className={styles.grid}>
      {BUTTON_CONFIGS.map((config: ButtonConfig, index: number) => (
        <Button
          key={`${config.value}-${index}`}
          config={config}
          onPress={onButtonPress}
          isActive={currentOperation === config.value}
        />
      ))}
    </div>
  );
};

export default ButtonGrid;