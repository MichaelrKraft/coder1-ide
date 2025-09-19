import React, { memo, forwardRef, useState, useCallback } from 'react';
import { useDesignTokens } from './useDesignTokens';
import './Button.css';

// Button component props
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'base' | 'lg';
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  glow?: boolean;
  children: React.ReactNode;
}

// Button component with forward ref for accessibility
const Button = memo(forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'base',
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  glow = false,
  disabled = false,
  className = '',
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  ...props
}, ref) => {
  const { components, colors, animations } = useDesignTokens();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  
  // Handle interactions with proper event propagation
  const handleMouseEnter = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      setIsHovered(true);
      onMouseEnter?.(event);
    }
  }, [disabled, loading, onMouseEnter]);
  
  const handleMouseLeave = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setIsHovered(false);
    setIsPressed(false);
    onMouseLeave?.(event);
  }, [onMouseLeave]);
  
  const handleMouseDown = useCallback(() => {
    if (!disabled && !loading) {
      setIsPressed(true);
    }
  }, [disabled, loading]);
  
  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);
  
  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      onClick?.(event);
    }
  }, [disabled, loading, onClick]);
  
  // Generate CSS classes
  const baseClasses = 'ds-button';
  const variantClass = `ds-button--${variant}`;
  const sizeClass = `ds-button--${size}`;
  const stateClasses = [
    loading && 'ds-button--loading',
    disabled && 'ds-button--disabled',
    fullWidth && 'ds-button--full-width',
    glow && 'ds-button--glow',
    isHovered && 'ds-button--hover',
    isPressed && 'ds-button--pressed'
  ].filter(Boolean).join(' ');
  
  const finalClassName = [baseClasses, variantClass, sizeClass, stateClasses, className]
    .filter(Boolean)
    .join(' ');
  
  // Generate inline styles for dynamic properties
  const buttonStyles: React.CSSProperties = {
    ...components.button.base,
    ...components.button.sizes[size],
    ...components.button.variants[variant],
    width: fullWidth ? '100%' : 'auto',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    // Add performance optimizations
    willChange: 'transform, box-shadow, background-color',
    backfaceVisibility: 'hidden',
    // Dynamic transform for interactions
    transform: isPressed ? 'translateY(1px) scale(0.98)' : isHovered ? 'translateY(-1px)' : 'translateY(0)',
  };
  
  // Enhanced glow effect for interactive states
  if (glow && isHovered && !disabled && !loading) {
    const glowColor = variant === 'primary' ? colors.primary : 
                     variant === 'secondary' ? colors.secondary :
                     variant === 'danger' ? colors.error :
                     variant === 'success' ? colors.success :
                     colors.primary;
    
    buttonStyles.boxShadow = `0 0 20px ${glowColor}40, 0 0 40px ${glowColor}20`;
  }
  
  return (
    <button
      ref={ref}
      className={finalClassName}
      style={buttonStyles}
      disabled={disabled || loading}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {/* Button content container */}
      <span className="ds-button__content">
        {/* Left icon */}
        {leftIcon && !loading && (
          <span className="ds-button__icon ds-button__icon--left">
            {leftIcon}
          </span>
        )}
        
        {/* Loading spinner */}
        {loading && (
          <span className="ds-button__icon ds-button__icon--left">
            <LoadingSpinner size={size} />
          </span>
        )}
        
        {/* Button text */}
        <span className="ds-button__text">
          {loading && loadingText ? loadingText : children}
        </span>
        
        {/* Right icon */}
        {rightIcon && !loading && (
          <span className="ds-button__icon ds-button__icon--right">
            {rightIcon}
          </span>
        )}
      </span>
      
      {/* Ripple effect overlay */}
      <span className="ds-button__ripple" />
    </button>
  );
}));

// Loading spinner component
const LoadingSpinner = memo(({ size }: { size: 'sm' | 'base' | 'lg' }) => {
  const spinnerSize = size === 'sm' ? '14px' : size === 'base' ? '16px' : '18px';
  
  return (
    <svg
      className="ds-button__spinner"
      width={spinnerSize}
      height={spinnerSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="ds-button__spinner-circle"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="31.416"
        strokeDashoffset="31.416"
      />
    </svg>
  );
});

// Button group component for related actions
export const ButtonGroup = memo(({ 
  children, 
  className = '',
  spacing = 'base'
}: {
  children: React.ReactNode;
  className?: string;
  spacing?: 'sm' | 'base' | 'lg';
}) => {
  const { getSpacing } = useDesignTokens();
  const gap = spacing === 'sm' ? getSpacing(2) : spacing === 'base' ? getSpacing(3) : getSpacing(4);
  
  return (
    <div 
      className={`ds-button-group ${className}`}
      style={{ 
        display: 'flex', 
        gap,
        alignItems: 'center',
        flexWrap: 'wrap'
      }}
    >
      {children}
    </div>
  );
});

// Button toolbar for multiple button groups
export const ButtonToolbar = memo(({ 
  children, 
  className = '' 
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { getSpacing } = useDesignTokens();
  
  return (
    <div 
      className={`ds-button-toolbar ${className}`}
      style={{ 
        display: 'flex', 
        gap: getSpacing(4),
        alignItems: 'center',
        flexWrap: 'wrap'
      }}
      role="toolbar"
    >
      {children}
    </div>
  );
});

// Icon button variant for actions with just icons
export const IconButton = memo(forwardRef<HTMLButtonElement, Omit<ButtonProps, 'children'> & {
  icon: React.ReactNode;
  'aria-label': string;
}>(({ icon, size = 'base', ...props }, ref) => {
  const iconSizes = {
    sm: '20px',
    base: '24px', 
    lg: '28px'
  };
  
  return (
    <Button
      ref={ref}
      size={size}
      className="ds-icon-button"
      {...props}
      style={{
        width: iconSizes[size],
        height: iconSizes[size],
        padding: 0,
        minWidth: 'auto',
        ...props.style
      }}
    >
      {icon}
    </Button>
  );
}));

// Display name for debugging
Button.displayName = 'Button';
ButtonGroup.displayName = 'ButtonGroup';
ButtonToolbar.displayName = 'ButtonToolbar';
IconButton.displayName = 'IconButton';

export default Button;