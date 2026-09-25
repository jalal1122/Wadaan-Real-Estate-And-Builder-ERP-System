import { Metadata } from 'next';
import { AuthVault } from '../../../components/auth/AuthVault';

export const metadata: Metadata = {
  title: 'Authentication Vault | Wadaan Real Estate ERP',
  description: 'Access Portal for Wadaan Real Estate & Builders Financial Suite',
};

export default function LoginPage() {
  return <AuthVault />;
}