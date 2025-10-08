'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function ShadCNTestPage() {
  const [clickCount, setClickCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-cyan-400">ShadCN Component Test Page</h1>
          <p className="text-gray-400">
            This is an isolated test page to verify ShadCN components work correctly without affecting the IDE.
          </p>
        </div>

        {/* Test Section */}
        <div className="bg-gray-800 rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold text-cyan-300">Button Component Test</h2>
          
          {/* Button Variants */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="default" onClick={() => setClickCount(c => c + 1)}>
                  Default ({clickCount})
                </Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>

            {/* Button Sizes */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">🚀</Button>
              </div>
            </div>

            {/* Disabled State */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">States</h3>
              <div className="flex flex-wrap gap-3">
                <Button disabled>Disabled</Button>
                <Button className="bg-coder1-cyan hover:bg-coder1-cyan-secondary">
                  Custom Coder1 Style
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Status */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-green-400 font-semibold mb-2">✅ Integration Status</h3>
          <ul className="text-sm text-green-300 space-y-1">
            <li>• ShadCN successfully initialized</li>
            <li>• Button component imported and working</li>
            <li>• CSS variables integrated with Tailwind</li>
            <li>• Click counter: {clickCount}</li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 pt-4">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/ide'}
          >
            ← Back to IDE
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
          >
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}