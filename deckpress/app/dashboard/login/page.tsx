'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export default function DashboardLoginPage(): JSX.Element {
  const router = useRouter();
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/dashboard-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        router.push('/dashboard');
        return;
      }

      if (response.status === 401) {
        setError('Incorrect password');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg p-8 shadow-xl">
        <h1 className="text-2xl font-bold mb-2">Deckpress Dashboard</h1>
        <p className="text-sm text-slate-400 mb-6">
          Enter your password to continue.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold tracking-widest text-violet-400 uppercase">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:border-violet-500"
              autoFocus
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-md px-4 py-2 transition-colors"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
