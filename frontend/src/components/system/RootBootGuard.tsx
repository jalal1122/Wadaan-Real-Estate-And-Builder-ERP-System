'use client';

import React, { useState } from 'react';
import { useSystemInit } from '../../hooks/useSystemInit';
import { StarterModal } from './StarterModal';

export function RootBootGuard({ children }: { children: React.ReactNode }) {
  const { status, isLoadingStatus } = useSystemInit();
  const [isDismissed, setIsDismissed] = useState(false);

  const showModal = !isDismissed && !isLoadingStatus && Boolean(status && !status.isInitialized);

  return (
    <>
      {children}
      {showModal && (
        <StarterModal
          isOpen={showModal}
          onClose={() => setIsDismissed(true)}
        />
      )}
    </>
  );
}
