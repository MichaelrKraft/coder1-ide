import React from 'react';

interface DisplayProps {
  value: string;
  hasMemory: boolean;
}

export const Display: React.FC<DisplayProps> = ({ value, hasMemory }) => {
  return (
    <div className="calculator-display">
      <div className="memory-indicator">
        {hasMemory && <span className="memory-dot">M</span>}
      </div>
      <div className="display-value" aria-live="polite" aria-label={`Display shows ${value}`}>
        {value}
      </div>
    </div>
  );
};