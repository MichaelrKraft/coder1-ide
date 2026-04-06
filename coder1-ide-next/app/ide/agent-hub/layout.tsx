import { redirect } from 'next/navigation';
import AgentHubLayoutComponent from '@/components/agent-hub/AgentHubLayout';

export default function AgentHubLayout({ children }: { children: React.ReactNode }) {
  const agentHubEnabled = process.env.NEXT_PUBLIC_ENABLE_AGENT_HUB === 'true';
  if (!agentHubEnabled) redirect('/ide');
  return <AgentHubLayoutComponent>{children}</AgentHubLayoutComponent>;
}
