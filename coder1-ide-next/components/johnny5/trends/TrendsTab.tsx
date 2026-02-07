'use client';

import React from 'react';
import { ComingSoonPlaceholder } from '../shared/ComingSoonPlaceholder';

interface TrendsTabProps {
  className?: string;
}

export default function TrendsTab({ className = '' }: TrendsTabProps) {
  return (
    <div className={className}>
      <ComingSoonPlaceholder
        featureName="Trend Monitor"
        description="Johnny5 will soon monitor industry trends, competitor updates, and technology changes relevant to your projects."
      />
    </div>
  );
}
