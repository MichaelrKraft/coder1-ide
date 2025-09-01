'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
          <h2 className="text-xl font-semibold mb-4">Something went wrong!</h2>
          <p className="text-gray-300 mb-4">
            {error.message || 'A global error occurred'}
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}