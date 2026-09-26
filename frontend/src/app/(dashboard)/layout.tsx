'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoadingUser, isFetchingUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoadingUser && !isFetchingUser && !currentUser) {
      router.replace('/login');
    }
  }, [isLoadingUser, isFetchingUser, currentUser, router]);

  if (!currentUser && (isLoadingUser || isFetchingUser)) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#059669] rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-400">Verifying session...</p>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

