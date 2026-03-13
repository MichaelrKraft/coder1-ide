'use client';

import React from 'react';
import { FlowTracePanel } from '@/components/flowtrace/FlowTracePanel';

export default function FlowTracePage() {
  return (
    <div className="h-screen bg-gray-900">
      <FlowTracePanel />
    </div>
  );
}
