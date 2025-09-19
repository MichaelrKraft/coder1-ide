'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VibeDashboardPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the CANONICAL vibe-dashboard.html
    window.location.href = '/vibe-dashboard.html';
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