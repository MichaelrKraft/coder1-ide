'use client';

import React, { useEffect, useState, useCallback } from 'react';

// Toast types with their visual styles
export type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  dismissible?: boolean;
  link?: string;
  linkLabel?: string;
  onClose: () => void;
}

// Default durations per type (errors stay longer)
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  info: 3000,
  success: 3000,
  warning: 5000,
  error: 8000,
};

// Color schemes for each type
const TYPE_STYLES: Record<ToastType, { border: string; glow: string; icon: string }> = {
  info: {
    border: 'border-coder1-cyan',
    glow: 'rgba(0, 217, 255, 0.3)',
    icon: 'ℹ️',
  },
  success: {
    border: 'border-green-500',
    glow: 'rgba(34, 197, 94, 0.3)',
    icon: '✓',
  },
  warning: {
    border: 'border-yellow-500',
    glow: 'rgba(234, 179, 8, 0.3)',
    icon: '⚠',
  },
  error: {
    border: 'border-red-500',
    glow: 'rgba(239, 68, 68, 0.4)',
    icon: '✕',
  },
};

export default function Toast({
  message,
  type = 'info',
  duration,
  dismissible = true,
  link,
  linkLabel,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const effectiveDuration = duration ?? DEFAULT_DURATIONS[type];
  const styles = TYPE_STYLES[type];

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  }, [onClose]);

  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      handleClose();
    }, effectiveDuration);

    return () => clearTimeout(timer);
  }, [effectiveDuration, handleClose, isPaused]);

  return (
    <div
      className={`
        fixed bottom-4 right-4 max-w-md px-4 py-3 bg-bg-tertiary ${styles.border}
        rounded-md shadow-lg z-50 transition-all duration-300 flex items-start gap-3
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
      style={{
        boxShadow: `0 0 20px ${styles.glow}`,
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Icon */}
      <span className="text-lg flex-shrink-0">{styles.icon}</span>

      {/* Message + optional action link */}
      <span className="text-sm text-text-primary flex-1">
        {message}
        {link && (
          <a
            href={link}
            className="ml-2 underline text-coder1-cyan hover:text-white transition-colors whitespace-nowrap"
            onClick={onClose}
          >
            {linkLabel ?? 'Go'}
          </a>
        )}
      </span>

      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={handleClose}
          className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0 ml-2"
          aria-label="Dismiss"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// Toast Container for managing multiple toasts
interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  link?: string;
  linkLabel?: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            transform: `translateY(-${index * 8}px)`,
            zIndex: 50 - index,
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            link={toast.link}
            linkLabel={toast.linkLabel}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}