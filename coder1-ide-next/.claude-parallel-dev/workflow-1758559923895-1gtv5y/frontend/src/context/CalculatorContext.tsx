import React, { createContext, useContext, ReactNode } from 'react';
import { CalculatorContextType } from '../types/calculator';
import { useCalculator } from '../hooks/useCalculator';

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

interface CalculatorProviderProps {
  children: ReactNode;
}

/**
 * Calculator Context Provider
 * 
 * Provides calculator state and actions to child components through React Context.
 * This pattern enables:
 * - Global state management without prop drilling
 * - Multiple calculator instances with isolated state
 * - Easy testing with context mocking
 * - Plugin architecture for calculator extensions
 */
export const CalculatorProvider: React.FC<CalculatorProviderProps> = ({ children }) => {
  const calculatorHook = useCalculator();

  return (
    <CalculatorContext.Provider value={calculatorHook}>
      {children}
    </CalculatorContext.Provider>
  );
};

/**
 * Hook to access calculator context
 * 
 * @throws Error if used outside of CalculatorProvider
 * @returns Calculator state and actions
 */
export const useCalculatorContext = (): CalculatorContextType => {
  const context = useContext(CalculatorContext);
  
  if (context === undefined) {
    throw new Error(
      'useCalculatorContext must be used within a CalculatorProvider. ' +
      'Make sure your component is wrapped with <CalculatorProvider>.'
    );
  }
  
  return context;
};

/**
 * HOC for components that need calculator context
 * 
 * @param Component - Component to wrap with calculator context
 * @returns Component with calculator context injected
 */
export const withCalculatorContext = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  const WrappedComponent: React.FC<P> = (props) => (
    <CalculatorProvider>
      <Component {...props} />
    </CalculatorProvider>
  );
  
  WrappedComponent.displayName = `withCalculatorContext(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};