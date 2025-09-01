import Link from 'next/link';
import { Code, FileText, Users } from 'lucide-react';
import { glows } from '@/lib/design-tokens';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-coder1-cyan to-coder1-purple bg-clip-text text-transparent">
            Welcome back, [User]!
          </h1>
          <p className="text-xl text-text-secondary">
            Current Project: Recipe App
          </p>
          <p className="text-lg text-text-muted mt-2">
            Active Agents: 3
          </p>
          <p className="text-lg text-coder1-cyan">
            Today's Progress: 67% complete
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <Link
            href="/ide"
            className="group relative p-8 bg-bg-secondary border border-border-default rounded-lg hover:border-coder1-cyan transition-all duration-300"
          >
            <div className="flex flex-col items-center text-center">
              <Code className="w-12 h-12 mb-4 text-coder1-cyan" />
              <h3 className="text-xl font-semibold mb-2">IDE</h3>
              <span className="text-sm text-text-secondary">[Open]</span>
            </div>
            <div 
              className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ boxShadow: glows.cyan.medium }}
            />
          </Link>

          <Link
            href="/templates"
            className="group relative p-8 bg-bg-secondary border border-border-default rounded-lg hover:border-coder1-purple transition-all duration-300"
          >
            <div className="flex flex-col items-center text-center">
              <FileText className="w-12 h-12 mb-4 text-coder1-purple" />
              <h3 className="text-xl font-semibold mb-2">Templates</h3>
              <span className="text-sm text-text-secondary">[View]</span>
            </div>
            <div 
              className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ boxShadow: glows.purple.medium }}
            />
          </Link>

          <Link
            href="/agent-dashboard"
            className="group relative p-8 bg-bg-secondary border border-border-default rounded-lg hover:border-orange-400 transition-all duration-300"
          >
            <div className="flex flex-col items-center text-center">
              <Users className="w-12 h-12 mb-4 text-orange-400" />
              <h3 className="text-xl font-semibold mb-2">Agent</h3>
              <span className="text-sm text-text-secondary">[Monitor]</span>
            </div>
            <div 
              className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ boxShadow: glows.orange.medium }}
            />
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-text-primary">Recent Activity:</h2>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex items-center gap-2">
              <span className="text-coder1-cyan">•</span>
              PRD completed for RecipeApp
            </li>
            <li className="flex items-center gap-2">
              <span className="text-coder1-purple">•</span>
              3 agents working on backend
            </li>
            <li className="flex items-center gap-2">
              <span className="text-orange-400">•</span>
              Frontend 67% complete
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}