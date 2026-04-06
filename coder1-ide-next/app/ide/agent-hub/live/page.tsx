'use client';

import { useState, useEffect } from 'react';
import { Radio, Bot, Clock, Activity } from 'lucide-react';

interface AgentActivity {
  id: string;
  name: string;
  status: string;
  lastRunAt: string | null;
  currentRunId?: string;
}

export default function LivePage() {
  const [agents, setAgents] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = () => {
      fetch('/api/agent-hub/agents')
        .then(r => r.json())
        .then(data => {
          setAgents(data.agents ?? []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    fetchAgents();
    const interval = setInterval(fetchAgents, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const runningAgents = agents.filter(a => a.status === 'running');
  const idleAgents = agents.filter(a => a.status !== 'running');

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-1">
        <Radio className="w-4 h-4 text-coder1-cyan" />
        <h1 className="text-lg font-semibold text-text-primary">Live Activity</h1>
        <span className="flex items-center gap-1 text-[10px] text-green-400 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Auto-refreshing
        </span>
      </div>
      <p className="text-xs text-text-muted mb-6">
        Real-time view of what your agents are doing right now.
      </p>

      {loading ? (
        <p className="text-xs text-text-muted">Loading...</p>
      ) : (
        <>
          {/* Running agents */}
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Active Now ({runningAgents.length})
            </h2>
            {runningAgents.length === 0 ? (
              <div className="bg-bg-secondary border border-border-default rounded-lg px-4 py-8 text-center">
                <Activity className="w-6 h-6 text-text-muted/30 mx-auto mb-2" />
                <p className="text-xs text-text-muted">No agents running right now.</p>
                <p className="text-[10px] text-text-muted/60 mt-1">
                  Run a task from the Tasks page to see live activity here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {runningAgents.map(agent => (
                  <div key={agent.id} className="bg-bg-secondary border border-coder1-cyan/20 rounded-lg px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-coder1-cyan/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-coder1-cyan" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{agent.name}</p>
                      <p className="text-[10px] text-coder1-cyan flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-coder1-cyan animate-pulse" />
                        Running
                      </p>
                    </div>
                    {agent.lastRunAt && (
                      <span className="text-[10px] text-text-muted">
                        Started {new Date(agent.lastRunAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Idle agents */}
          <section>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Idle ({idleAgents.length})
            </h2>
            <div className="space-y-1">
              {idleAgents.map(agent => (
                <div key={agent.id} className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-bg-secondary transition-colors">
                  <Bot className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-xs text-text-secondary flex-1">{agent.name}</span>
                  <span className="text-[10px] text-text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {agent.lastRunAt
                      ? `Last run ${new Date(agent.lastRunAt).toLocaleDateString()}`
                      : 'Never run'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
