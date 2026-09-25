'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Landmark, FileText, SlidersHorizontal } from 'lucide-react';

interface GLTab {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchMode: 'exact' | 'startsWith';
}

const GL_TABS: GLTab[] = [
  {
    href: '/accounts',
    label: 'Chart of Accounts',
    icon: <Landmark className="w-3.5 h-3.5" />,
    matchMode: 'exact',
  },
  {
    href: '/journals',
    label: 'Journal Entries',
    icon: <FileText className="w-3.5 h-3.5" />,
    matchMode: 'startsWith',
  },
  {
    href: '/trial-balance',
    label: 'Trial Balance',
    icon: <SlidersHorizontal className="w-3.5 h-3.5" />,
    matchMode: 'exact',
  },
];

export default function GLNavTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200">
      <nav className="flex space-x-6 -mb-px">
        {GL_TABS.map((tab) => {
          const isActive =
            tab.matchMode === 'exact'
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-[#059669] text-[#0F172A] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <span
                className={isActive ? 'text-[#059669]' : 'text-slate-400'}
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
