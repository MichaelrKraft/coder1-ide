'use client';

import { useEffect, useState } from 'react';

export default function VibeDashboardPage() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Set state first to prevent React cleanup conflicts
    setIsRedirecting(true);

    // Use a small delay to let React finish its render cycle
    // before triggering the full page navigation
    const timer = setTimeout(() => {
      window.location.replace('/vibe-dashboard.html');
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Loading Vibe Dashboard...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mx-auto"></div>
      </div>
    </div>
  );
}