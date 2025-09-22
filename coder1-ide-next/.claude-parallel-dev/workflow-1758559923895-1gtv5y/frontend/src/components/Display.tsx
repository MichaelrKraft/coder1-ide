import React from 'react';
import { formatNumber } from '../utils/calculator';

interface DisplayProps {
  value: string;
  operation?: string | null;
  previousValue?: string;
}

export const Display: React.FC<DisplayProps> = ({ 
  value, 
  operation, 
  previousValue 
}) => {
  const displayValue = value === 'Error' ? value : formatNumber(value);
  
  return (
    <div className="calculator-display">
      <div className="display-history">
        {previousValue && operation && (
          <span className="history-text">
            {formatNumber(previousValue)} {operation}
          </span>
        )}
      </div>
      <div className="display-current">
        <span 
          className={`current-value ${value === 'Error' ? 'error' : ''}`}
          title={displayValue}
        >
          {displayValue}
        </span>
      </div>
    </div>
  );
};