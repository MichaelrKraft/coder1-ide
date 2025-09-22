import React from 'react';
import { Button } from './Button';
import { Operation } from '../types/calculator';
import { getOperationSymbol } from '../utils/calculator';

interface ButtonGridProps {
  onNumberClick: (num: string) => void;
  onOperationClick: (operation: Operation) => void;
  onEqualsClick: () => void;
  onClearClick: () => void;
  onClearEntryClick: () => void;
  onBackspaceClick: () => void;
  onDecimalClick: () => void;
  onToggleSignClick: () => void;
}

export const ButtonGrid: React.FC<ButtonGridProps> = ({
  onNumberClick,
  onOperationClick,
  onEqualsClick,
  onClearClick,
  onClearEntryClick,
  onBackspaceClick,
  onDecimalClick,
  onToggleSignClick
}) => {
  return (
    <div className="button-grid">
      {/* Row 1: Memory and Clear functions */}
      <Button
        label="C"
        onClick={onClearClick}
        type="function"
        aria-label="Clear all"
      />
      <Button
        label="CE"
        onClick={onClearEntryClick}
        type="function"
        aria-label="Clear entry"
      />
      <Button
        label="⌫"
        onClick={onBackspaceClick}
        type="function"
        aria-label="Backspace"
      />
      <Button
        label={getOperationSymbol('/')}
        onClick={() => onOperationClick('/')}
        type="operation"
        aria-label="Divide"
      />

      {/* Row 2: Numbers 7-9 and multiply */}
      <Button
        label="7"
        onClick={() => onNumberClick('7')}
        type="number"
      />
      <Button
        label="8"
        onClick={() => onNumberClick('8')}
        type="number"
      />
      <Button
        label="9"
        onClick={() => onNumberClick('9')}
        type="number"
      />
      <Button
        label={getOperationSymbol('*')}
        onClick={() => onOperationClick('*')}
        type="operation"
        aria-label="Multiply"
      />

      {/* Row 3: Numbers 4-6 and subtract */}
      <Button
        label="4"
        onClick={() => onNumberClick('4')}
        type="number"
      />
      <Button
        label="5"
        onClick={() => onNumberClick('5')}
        type="number"
      />
      <Button
        label="6"
        onClick={() => onNumberClick('6')}
        type="number"
      />
      <Button
        label={getOperationSymbol('-')}
        onClick={() => onOperationClick('-')}
        type="operation"
        aria-label="Subtract"
      />

      {/* Row 4: Numbers 1-3 and add */}
      <Button
        label="1"
        onClick={() => onNumberClick('1')}
        type="number"
      />
      <Button
        label="2"
        onClick={() => onNumberClick('2')}
        type="number"
      />
      <Button
        label="3"
        onClick={() => onNumberClick('3')}
        type="number"
      />
      <Button
        label={getOperationSymbol('+')}
        onClick={() => onOperationClick('+')}
        type="operation"
        aria-label="Add"
      />

      {/* Row 5: Zero, decimal, sign toggle, and equals */}
      <Button
        label="±"
        onClick={onToggleSignClick}
        type="function"
        aria-label="Toggle sign"
      />
      <Button
        label="0"
        onClick={() => onNumberClick('0')}
        type="number"
      />
      <Button
        label="."
        onClick={onDecimalClick}
        type="function"
        aria-label="Decimal point"
      />
      <Button
        label="="
        onClick={onEqualsClick}
        type="equals"
        aria-label="Equals"
      />
    </div>
  );
};