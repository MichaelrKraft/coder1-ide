'use client';

import { AnimatedBackground, GradientBackground } from '@/components/ui/animated-background';

export default function TestBackgroundPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Test both backgrounds */}
      <AnimatedBackground />
      
      <div className="relative z-10 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Background Test</h1>
        <p className="text-gray-300">
          If you can see animated particles and connections, the background is working!
        </p>
        
        <div className="mt-8 space-y-4">
          <button 
            onClick={() => window.location.href = '/auth/login'}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go to Login Page
          </button>
          
          <button 
            onClick={() => window.location.href = '/auth/register'}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg ml-4"
          >
            Go to Register Page
          </button>
        </div>
      </div>
    </div>
  );
}