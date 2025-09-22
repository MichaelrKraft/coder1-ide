import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
  type?: 'number' | 'operation' | 'function' | 'equals';
  disabled?: boolean;
  'aria-label'?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  className = '',
  type = 'number',
  disabled = false,
  'aria-label': ariaLabel
}) => {
  const baseClasses = 'calculator-button';
  const typeClasses = {
    number: 'btn-number',
    operation: 'btn-operation',
    function: 'btn-function',
    equals: 'btn-equals'
  };

  const fullClassName = `${baseClasses} ${typeClasses[type]} ${className}`.trim();

  return (
    <button
      className={fullClassName}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || label}
      type="button"
    >
      <span className="button-text">{label}</span>
    </button>
  );
};