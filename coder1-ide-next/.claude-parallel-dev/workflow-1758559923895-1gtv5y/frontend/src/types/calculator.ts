export type Operation = '+' | '-' | '*' | '/' | '=';

export type CalculatorButton = {
  label: string;
  value: string;
  type: 'number' | 'operation' | 'function' | 'equals';
  className?: string;
};

export interface CalculatorState {
  display: string;
  previousValue: string;
  operation: Operation | null;
  waitingForNewValue: boolean;
  history: string[];
  memory: string;
}

export interface CalculatorContextType {
  state: CalculatorState;
  inputNumber: (num: string) => void;
  inputOperation: (operation: Operation) => void;
  calculate: () => void;
  clear: () => void;
  clearEntry: () => void;
  backspace: () => void;
  inputDecimal: () => void;
  toggleSign: () => void;
  memoryAdd: () => void;
  memorySubtract: () => void;
  memoryRecall: () => void;
  memoryClear: () => void;
}