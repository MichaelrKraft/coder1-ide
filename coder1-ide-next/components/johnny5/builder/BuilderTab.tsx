'use client';

import React from 'react';
import { ComingSoonPlaceholder } from '../shared/ComingSoonPlaceholder';

interface BuilderTabProps {
  className?: string;
}

export default function BuilderTab({ className }: BuilderTabProps) {
  return (
    <div className={className}>
      <ComingSoonPlaceholder
        featureName="Autonomous Builder"
        description="Johnny5 will soon be able to autonomously build features, run tests, and create pull requests based on your project's patterns and needs."
      />
    </div>
  );
}
