export const performCalculation = (
  firstValue: number,
  secondValue: number,
  operation: string
): number => {
  switch (operation) {
    case '+':
      return firstValue + secondValue;
    case '-':
      return firstValue - secondValue;
    case '*':
      return firstValue * secondValue;
    case '/':
      if (secondValue === 0) {
        throw new Error('Cannot divide by zero');
      }
      return firstValue / secondValue;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
};

export const formatNumber = (num: number): string => {
  // Handle very large numbers with scientific notation
  if (Math.abs(num) >= 1e15) {
    return num.toExponential(6);
  }
  
  // Handle very small numbers
  if (Math.abs(num) < 1e-6 && num !== 0) {
    return num.toExponential(6);
  }
  
  // Regular formatting
  const formatted = num.toString();
  
  // Limit decimal places to prevent overflow
  if (formatted.includes('.')) {
    const parts = formatted.split('.');
    if (parts[1].length > 8) {
      return parseFloat(num.toFixed(8)).toString();
    }
  }
  
  return formatted;
};

export const isValidNumber = (str: string): boolean => {
  return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
};