import React from 'react';

/**
 * Button Props Interface
 * 
 * Defines the props that the Button component accepts.
 * This is a TypeScript best practice for type safety.
 */
export interface ButtonProps {
  /** The text or elements to display inside the button */
  children: React.ReactNode;
  
  /** Click handler function */
  onClick?: () => void;
  
  /** Button style variant */
  variant?: 'primary' | 'secondary' | 'danger';
  
  /** Whether the button is disabled */
  disabled?: boolean;
  
  /** Button type attribute */
  type?: 'button' | 'submit' | 'reset';
  
  /** Additional CSS class names */
  className?: string;
}

/**
 * Button Component
 * 
 * A reusable button component with multiple variants and states.
 * 
 * @example
 * ```tsx
 * <Button onClick={handleClick} variant="primary">
 *   Click Me
 * </Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
}) => {
  // Get the appropriate styles based on variant
  const variantStyles = getVariantStyles(variant);
  
  // Combine base styles with variant styles
  const buttonStyles: React.CSSProperties = {
    ...styles.base,
    ...variantStyles,
    ...(disabled ? styles.disabled : {}),
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={buttonStyles}
    >
      {children}
    </button>
  );
};

/**
 * Helper function to get styles for different button variants
 */
function getVariantStyles(variant: ButtonProps['variant']): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return styles.primary;
    case 'secondary':
      return styles.secondary;
    case 'danger':
      return styles.danger;
    default:
      return styles.primary;
  }
}

/**
 * Button Styles
 * 
 * In a real project, you might use:
 * - CSS Modules for scoped styles
 * - styled-components for CSS-in-JS
 * - Tailwind CSS for utility classes
 */
const styles = {
  // Base styles shared by all buttons
  base: {
    padding: '12px 24px',
    fontSize: '1rem',
    fontWeight: '600' as const,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    outline: 'none',
  } as React.CSSProperties,
  
  // Primary button variant (default)
  primary: {
    backgroundColor: '#00d9ff',
    color: '#0f1419',
  } as React.CSSProperties,
  
  // Secondary button variant
  secondary: {
    backgroundColor: '#2d3748',
    color: '#c5d1d8',
    border: '1px solid #4a5568',
  } as React.CSSProperties,
  
  // Danger button variant (for destructive actions)
  danger: {
    backgroundColor: '#f56565',
    color: '#fff',
  } as React.CSSProperties,
  
  // Disabled state
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,
};

/**
 * Usage Examples:
 * 
 * Basic Usage:
 * <Button onClick={() => console.log('Clicked!')}>
 *   Click Me
 * </Button>
 * 
 * With Variant:
 * <Button variant="secondary">
 *   Secondary Action
 * </Button>
 * 
 * Disabled State:
 * <Button disabled>
 *   Cannot Click
 * </Button>
 * 
 * Submit Button in Form:
 * <Button type="submit" variant="primary">
 *   Submit Form
 * </Button>
 */

export default Button;
