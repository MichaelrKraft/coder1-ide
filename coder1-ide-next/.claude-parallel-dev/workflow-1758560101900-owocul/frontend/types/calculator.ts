export type Operation = '+' | '-' | '*' | '/' | '=';

export type ButtonType = 'number' | 'operation' | 'clear' | 'equals' | 'decimal';

export interface ButtonConfig {
  label: string;
  value: string;
  type: ButtonType;
  className?: string;
}

export interface CalculatorState {
  display: string;
  previousValue: number | null;
  currentOperation: Operation | null;
  waitingForNewValue: boolean;
}