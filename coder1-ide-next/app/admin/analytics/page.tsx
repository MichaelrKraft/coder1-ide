'use client';

import { ExternalLink, MousePointer, Eye, Users, Activity } from 'lucide-react';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

// Derive the PostHog app URL from the host
function getPostHogAppUrl() {
  if (POSTHOG_HOST.includes('eu.i.posthog.com')) return 'https://eu.posthog.com';
  return 'https://us.posthog.com';
}

const EVENTS_TRACKED = [
  { event: '$pageview', description: 'Every page load — automatic', automatic: true },
  { event: '$pageleave', description: 'When users leave a page — automatic', automatic: true },
  { event: '$autocapture', description: 'Button clicks, form inputs — automatic', automatic: true },
  { event: 'ide_loaded', description: 'User opened the IDE', automatic: false },
  { event: 'terminal_created', description: 'User opened a terminal tab', automatic: false },
  { event: 'file_opened', description: 'User opened a file in the editor', automatic: false },
  { event: 'johnny5_message_sent', description: 'User sent a message to Johnny5', automatic: false },
  { event: 'checkout_started', description: 'User clicked upgrade to Pro', automatic: false },
  { event: 'bridge_connected', description: 'User connected the bridge CLI', automatic: false },
];

export default function AdminAnalytics() {
  const configured = !!POSTHOG_KEY;
  const posthogAppUrl = getPostHogAppUrl();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-gray-400 mt-1">PostHog — user behavior, funnels, and session recordings</p>
        </div>
        {configured && (
          <a
            href="https://us.posthog.com/project/323107/web"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open PostHog Dashboard
          </a>
        )}
      </div>

      {!configured ? (
        /* Setup instructions */
        <div className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-400 text-sm font-medium mb-1">PostHog not configured</p>
            <p className="text-gray-400 text-sm">Add your PostHog keys to <code className="bg-gray-700 px-1 rounded">.env.local</code> to enable analytics.</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h2 className="text-sm font-medium text-white mb-3">Setup (2 minutes)</h2>
            <ol className="space-y-3 text-sm text-gray-300">
              <li className="flex gap-3">
                <span className="text-cyan-400 font-mono font-bold">1.</span>
                <span>Sign up at <a href="https://posthog.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">posthog.com</a> (free up to 1M events/month)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-cyan-400 font-mono font-bold">2.</span>
                <span>Go to <strong className="text-white">Settings → Project → API Keys</strong> and copy your Project API Key</span>
              </li>
              <li className="flex gap-3">
                <span className="text-cyan-400 font-mono font-bold">3.</span>
                <span>Add these two lines to your <code className="bg-gray-700 px-1 rounded">.env.local</code> file:</span>
              </li>
            </ol>
            <pre className="mt-3 bg-gray-900 border border-gray-600 rounded p-3 text-xs text-green-400 font-mono">
{`NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com`}
            </pre>
            <p className="text-xs text-gray-500 mt-2">
              Use <code className="bg-gray-700 px-1 rounded">https://eu.i.posthog.com</code> if you signed up on EU servers.
            </p>
            <li className="flex gap-3 text-sm text-gray-300 mt-3 list-none">
              <span className="text-cyan-400 font-mono font-bold">4.</span>
              <span>Restart the dev server — analytics will begin tracking immediately.</span>
            </li>
          </div>
        </div>
      ) : (
        /* Configured state — show what's being tracked + link to PostHog */
        <div className="space-y-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
            <Activity className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-400 text-sm font-medium">PostHog connected</p>
              <p className="text-gray-400 text-xs mt-0.5">Events are being captured. View full analytics in the PostHog dashboard.</p>
            </div>
          </div>

          {/* Quick links to PostHog insights */}
          <div>
            <h2 className="text-sm font-medium text-white mb-3">Quick Access</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Web Analytics', icon: Eye, path: '/web' },
                { label: 'Funnels', icon: Users, path: '/insights' },
                { label: 'Session Recordings', icon: MousePointer, path: '/replay' },
                { label: 'All Events', icon: Activity, path: '/events' },
              ].map(({ label, icon: Icon, path }) => (
                <a
                  key={path}
                  href={`https://us.posthog.com/project/323107${path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center hover:bg-gray-700 transition-colors group"
                >
                  <Icon className="w-5 h-5 text-gray-400 group-hover:text-white mx-auto mb-1.5 transition-colors" />
                  <p className="text-xs text-gray-400 group-hover:text-white transition-colors">{label}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Events reference — shown regardless of config state */}
      <div className="mt-6">
        <h2 className="text-sm font-medium text-white mb-3">Events Being Tracked</h2>
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-700/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Event</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Type</th>
              </tr>
            </thead>
            <tbody>
              {EVENTS_TRACKED.map(({ event, description, automatic }) => (
                <tr key={event} className="border-b border-gray-700/50">
                  <td className="px-4 py-3 font-mono text-xs text-cyan-400">{event}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{description}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${automatic ? 'bg-green-500/10 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                      {automatic ? 'Auto' : 'Custom'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-600 mt-2">Custom events require <code className="bg-gray-700 px-1 rounded">trackEvent()</code> calls in the IDE components. Add more as needed.</p>
      </div>
    </div>
  );
}
