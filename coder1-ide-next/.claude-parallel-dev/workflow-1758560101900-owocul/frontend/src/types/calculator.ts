export type Operation = '+' | '-' | '*' | '/' | '=';

export interface CalculatorState {
  display: string;
  previousValue: number | null;
  operation: Operation | null;
  waitingForNewValue: boolean;
  memory: number;
}

export interface ButtonProps {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
  'aria-label'?: string;
}

export type CalculatorAction = 
  | { type: 'INPUT_NUMBER'; payload: string }
  | { type: 'INPUT_OPERATION'; payload: Operation }
  | { type: 'CALCULATE' }
  | { type: 'CLEAR_ALL' }
  | { type: 'CLEAR_ENTRY' }
  | { type: 'INPUT_DECIMAL' }
  | { type: 'MEMORY_ADD' }
  | { type: 'MEMORY_SUBTRACT' }
  | { type: 'MEMORY_RECALL' }
  | { type: 'MEMORY_CLEAR' };