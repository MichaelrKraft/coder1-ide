'use client';

import { useEffect } from 'react';

export default function OrchestratorPage() {
  useEffect(() => {
    // Redirect to the orchestrator HTML page
    window.location.href = '/orchestrator.html';
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent mx-auto mb-4"></div>
        <p>Loading AI Mastermind Orchestrator...</p>
      </div>
    </div>
  );
}