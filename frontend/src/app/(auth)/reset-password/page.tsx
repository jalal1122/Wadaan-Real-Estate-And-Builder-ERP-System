import { Metadata } from 'next';
import { ResetPasswordVault } from '../../../components/auth/ResetPasswordVault';

export const metadata: Metadata = {
  title: 'Reset PIN | Wadaan Real Estate ERP',
  description: 'Secure PIN Recovery for Wadaan Real Estate & Builders Financial Suite',
};

import { Suspense } from 'react';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">Loading...</div>}>
      <ResetPasswordVault />
    </Suspense>
  );
}
