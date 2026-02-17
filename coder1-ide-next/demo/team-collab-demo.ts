// ============================================================
//  Coder1 IDE - Team Collaboration Demo
//  Open this file in two browser windows to see real-time
//  collaborative editing with shared cursors.
// ============================================================

// ----------------------------------------------------------
//  SECTION A: User 1 - Edit this section
//  Try changing the team name, adding members, or modifying
//  the greeting message below.
// ----------------------------------------------------------

interface TeamMember {
  name: string;
  role: 'developer' | 'designer' | 'pm';
  active: boolean;
}

const team: TeamMember[] = [
  { name: 'Alice', role: 'developer', active: true },
  { name: 'Bob', role: 'designer', active: true },
  { name: 'Charlie', role: 'pm', active: false },
];

function getGreeting(member: TeamMember): string {
  const status = member.active ? 'online' : 'away';
  return `Hello ${member.name}! You are currently ${status}.`;
}

// ----------------------------------------------------------
//  SECTION B: User 2 - Edit this section
//  Try adding new tasks, changing priorities, or updating
//  the status of existing tasks.
// ----------------------------------------------------------

type Priority = 'low' | 'medium' | 'high' | 'critical';
type Status = 'todo' | 'in-progress' | 'review' | 'done';

interface Task {
  id: number;
  title: string;
  assignee: string;
  priority: Priority;
  status: Status;
}

const backlog: Task[] = [
  { id: 1, title: 'Set up CI/CD pipeline', assignee: 'Alice', priority: 'high', status: 'in-progress' },
  { id: 2, title: 'Design landing page', assignee: 'Bob', priority: 'medium', status: 'todo' },
  { id: 3, title: 'Write API documentation', assignee: 'Charlie', priority: 'low', status: 'todo' },
  { id: 4, title: 'Fix login redirect bug', assignee: 'Alice', priority: 'critical', status: 'review' },
];

function getTaskSummary(): string {
  const total = backlog.length;
  const done = backlog.filter(t => t.status === 'done').length;
  const inProgress = backlog.filter(t => t.status === 'in-progress').length;
  return `Sprint: ${done}/${total} done, ${inProgress} in progress`;
}

// ----------------------------------------------------------
//  SHARED: Both users can edit this section together
//  Watch each other's cursors as you type!
// ----------------------------------------------------------

const projectConfig = {
  name: 'Coder1 Demo Project',
  version: '1.0.0',
  description: 'A collaborative project built with Coder1 IDE',
  features: [
    'Real-time collaborative editing',
    'Shared cursors with user colors',
    'Terminal spectator mode',
    'Team presence awareness',
  ],
};

// Try this: Both users type in this function at the same time!
function celebrate(): string {
  return 'Teamwork makes the dream work!';
}

export { team, backlog, projectConfig, getGreeting, getTaskSummary, celebrate };
