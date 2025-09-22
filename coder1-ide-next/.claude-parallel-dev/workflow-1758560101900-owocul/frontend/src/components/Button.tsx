import React from 'react';
import { ButtonProps } from '../types/calculator';

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  className = '', 
  children, 
  disabled = false,
  'aria-label': ariaLabel
}) => {
  return (
    <button
      className={`calculator-button ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      type="button"
    >
      {children}
    </button>
  );
};