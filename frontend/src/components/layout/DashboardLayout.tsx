'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Landmark,
  Receipt,
  Building2,
  Coins,
  BarChart3,
  Lock,
  Briefcase,
  LogOut,
  Archive,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'General Ledger', href: '/accounts', icon: Landmark },
  { label: 'Accounts Payable', href: '/payables', icon: Receipt },
  { label: 'Projects & WIP', href: '/projects', icon: Building2 },
  { label: 'Deal Hub', href: '/deals', icon: Briefcase },
  { label: 'Cash & Cheque Gateway', href: '/receipts', icon: Coins },
  { label: 'Personal Ledger', href: '/personal', icon: UserRound },
  { label: 'Document Archive', href: '/documents', icon: Archive },
  { label: 'Executive Reports', href: '/reports', icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'CA';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="flex h-screen w-full bg-[#F9FAFB] text-slate-900 overflow-hidden font-sans antialiased">
      {/* LEFT SIDEBAR */}
      <aside
        id="app-sidebar"
        className="no-print w-64 flex-shrink-0 bg-[#0F172A] flex flex-col justify-between border-r border-slate-800 text-white select-none z-30"
      >
        <div>
          {/* Logo & Header */}
          <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-md shadow-emerald-900/30 overflow-hidden shrink-0 p-0.5">
              <Image src="/logo.PNG" alt="Wadaan Logo" width={36} height={36} className="object-contain" priority />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-[13px] tracking-tight text-white leading-tight truncate">
                Wadaan Real Estate
              </span>
              <span className="font-bold text-[13px] tracking-tight text-white leading-tight truncate">
                & Builders
              </span>
              <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider mt-0.5">
                ERP
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 mt-3" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                    isActive
                      ? 'border-l-4 border-[#059669] bg-slate-800 text-white font-medium shadow-sm'
                      : 'border-l-4 border-transparent text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User / Institution Section */}
        <div className="p-4 border-t border-slate-800 bg-[#0F172A]/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 flex-shrink-0 border border-slate-600">
                {getInitials(currentUser?.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {currentUser?.fullName || 'Chief Administrator'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  ERP Suite v1.0
                </p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP NAVIGATION BAR */}
        <header className="no-print h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-20 shadow-xs">
          <div className="flex items-center">
            {/* Header left area (formerly search bar) */}
            <h2 className="text-lg font-bold text-slate-800">Wadaan Real Estate & Builders ERP</h2>
          </div>

          {/* Right Header Status Actions */}
          <div className="flex items-center gap-4">
            {/* Period locked badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
              title="Fiscal Period Status"
            >
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Period Locked</span>
            </div>

            {/* User Chip */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[11px] font-bold">
                {getInitials(currentUser?.fullName)}
              </div>
              <span className="text-xs font-semibold text-slate-800 max-w-[120px] truncate hidden md:inline">
                {currentUser?.fullName || 'Admin'}
              </span>
            </div>
          </div>
        </header>

        {/* SCROLLABLE MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto bg-[#F9FAFB] p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
