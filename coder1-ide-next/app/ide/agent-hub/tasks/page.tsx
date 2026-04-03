'use client';

import IssueList from '@/components/agent-hub/issues/IssueList';

export default function TasksPage() {
  return (
    <div className="h-full flex flex-col">
      <IssueList />
    </div>
  );
}
