'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger?.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary text-text-primary">
      <h2 className="text-xl font-semibold mb-4">Something went wrong!</h2>
      <p className="text-text-secondary mb-4">
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-coder1-cyan text-black rounded hover:bg-coder1-cyan/80 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}