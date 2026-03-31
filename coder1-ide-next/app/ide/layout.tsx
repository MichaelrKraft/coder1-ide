'use client';

import RecoveryModal from '@/components/RecoveryModal';

export default function IDELayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 🛟 SESSION RESCUE: Always show recovery modal (it checks internally if recovery is available)
  // Removed env var check - the modal itself will hide if no recovery exists

  return (
    <>
      {children}
      {/* 🛟 SESSION RESCUE: Show recovery modal only on IDE pages */}
      <RecoveryModal />
    </>
  );
}
