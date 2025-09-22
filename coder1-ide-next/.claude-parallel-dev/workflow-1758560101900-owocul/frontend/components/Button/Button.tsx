import React from 'react';
import { ButtonConfig } from '../../types/calculator';
import styles from './Button.module.css';

interface ButtonProps {
  config: ButtonConfig;
  onPress: (value: string, type: string) => void;
  isActive?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ config, onPress, isActive }) => {
  const { label, value, type, className } = config;
  
  const handleClick = () => {
    onPress(value, type);
  };

  const buttonClasses = [
    styles.button,
    styles[type],
    className ? styles[className] : '',
    isActive ? styles.active : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClasses}
      onClick={handleClick}
      type="button"
      aria-label={`${label} ${type === 'number' ? 'number' : type}`}
    >
      {label}
    </button>
  );
};

export default Button;