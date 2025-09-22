import { Operation } from '../types/calculator';

export const formatNumber = (num: string): string => {
  // Handle very large numbers with scientific notation
  const number = parseFloat(num);
  if (Math.abs(number) > 999999999999 || (Math.abs(number) < 0.000001 && number !== 0)) {
    return number.toExponential(6);
  }
  
  // Format regular numbers with commas
  return number.toLocaleString('en-US', {
    maximumFractionDigits: 10,
    useGrouping: true
  });
};

export const performCalculation = (
  prevValue: string,
  nextValue: string,
  operation: Operation
): string => {
  const prev = parseFloat(prevValue);
  const next = parseFloat(nextValue);

  if (isNaN(prev) || isNaN(next)) {
    return nextValue;
  }

  let result: number;

  switch (operation) {
    case '+':
      result = prev + next;
      break;
    case '-':
      result = prev - next;
      break;
    case '*':
      result = prev * next;
      break;
    case '/':
      if (next === 0) {
        throw new Error('Cannot divide by zero');
      }
      result = prev / next;
      break;
    default:
      return nextValue;
  }

  // Handle floating point precision issues
  return parseFloat(result.toPrecision(12)).toString();
};

export const isValidNumber = (str: string): boolean => {
  return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
};

export const getOperationSymbol = (operation: Operation): string => {
  const symbols = {
    '+': '+',
    '-': '−',
    '*': '×',
    '/': '÷',
    '=': '='
  };
  return symbols[operation];
};