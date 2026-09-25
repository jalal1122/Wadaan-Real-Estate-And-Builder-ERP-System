import React, { useState, useRef, useEffect } from 'react';
import { ProjectItem, ProjectStatus } from '@/features/projects/types';
import { useUpdateProjectStatus } from '@/features/projects/hooks/useProjects';
import { formatPKR } from '@/lib/formatters';
import { MoreVertical, AlertTriangle, CheckCircle2, PauseCircle, PlayCircle, User } from 'lucide-react';

interface ProjectCardProps {
  project: ProjectItem;
  onViewTransactions?: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onViewTransactions }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const updateStatusMutation = useUpdateProjectStatus();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleStatusChange = (status: ProjectStatus) => {
    setMenuOpen(false);
    if (status !== project.status) {
      updateStatusMutation.mutate({ id: project.id, status });
    }
  };

  const burn = project.budgetBurnPercentage ?? 0;
  const isOver = project.isOverBudget;
  const isHighBurn = burn > 80 && !isOver;

  // Determine bar fill color
  let barColorClass = 'bg-emerald-500';
  if (isOver) {
    barColorClass = 'bg-red-500';
  } else if (isHighBurn) {
    barColorClass = 'bg-amber-500';
  }

  // Capped at 100% width for progress bar display
  const visualBarWidth = Math.min(Math.max(burn, 0), 100);

  return (
    <div
      data-testid={`project-card-${project.id}`}
      className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow relative"
    >
      {/* Header Row */}
      <div className="flex justify-between items-start border-b border-slate-100 pb-4">
        <div className="flex-1 pr-2">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-slate-900 text-lg leading-tight">
              {project.projectName}
            </h3>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 tracking-wider">
              {project.projectPrefix}
            </span>
          </div>
          <div>
            {project.status === 'ACTIVE' && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full">
                <PlayCircle className="w-3 h-3" />
                ACTIVE
              </span>
            )}
            {project.status === 'ON_HOLD' && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full">
                <PauseCircle className="w-3 h-3" />
                ON HOLD
              </span>
            )}
            {project.status === 'COMPLETED' && (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                COMPLETED
              </span>
            )}
          </div>
        </div>

        {/* Status Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="Project actions"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Change Status
              </div>
              <button
                type="button"
                onClick={() => handleStatusChange('ACTIVE')}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                  project.status === 'ACTIVE' ? 'font-semibold text-emerald-700' : 'text-slate-700'
                }`}
              >
                <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                Set Active
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('ON_HOLD')}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                  project.status === 'ON_HOLD' ? 'font-semibold text-amber-700' : 'text-slate-700'
                }`}
              >
                <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                Set On Hold
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('COMPLETED')}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                  project.status === 'COMPLETED' ? 'font-semibold text-slate-800' : 'text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                Set Completed
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Financial Snapshot */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Master BOQ (Budget)
          </p>
          <p className="text-sm font-medium font-mono text-slate-800">
            {formatPKR(project.masterBOQ)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Spent (WIP)
          </p>
          <p
            className={`text-sm font-medium font-mono ${
              isOver ? 'text-red-600 font-bold' : 'text-slate-900'
            }`}
          >
            {formatPKR(project.spentToDate)}
          </p>
        </div>
      </div>

      {/* Client Construction Contract Details if linked to a Client Deal */}
      {project.clientInfo && (
        <div data-testid={`project-client-info-${project.id}`} className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Client: {project.clientInfo.customerName}</span>
              {project.clientInfo.customerPhone && (
                <span className="text-[10px] text-slate-400 font-mono">({project.clientInfo.customerPhone})</span>
              )}
            </div>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
              Client Contract
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-0.5">
            <div>
              <span className="text-slate-400 text-[10px] block font-sans">Contract Value</span>
              <span className="font-bold text-slate-900">{formatPKR(project.clientInfo.contractValue)}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-sans">Client Paid</span>
              <span className="font-bold text-emerald-600">{formatPKR(project.clientInfo.totalCollected)}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-sans">Net Cash Margin</span>
              <span className={`font-bold ${Number(project.clientInfo.netCashMargin) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatPKR(project.clientInfo.netCashMargin)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Utilization and Health Bar */}
      <div className="mt-auto pt-2">
        <div className="flex justify-between items-center mb-1.5 text-xs">
          <span className="text-slate-500 font-medium">Budget Utilization</span>
          <span
            className={`font-mono font-bold ${
              isOver ? 'text-red-600' : isHighBurn ? 'text-amber-600' : 'text-slate-700'
            }`}
          >
            {burn.toFixed(1)}%
          </span>
        </div>

        {/* Progress Track */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            data-testid="health-bar-fill"
            className={`h-2 rounded-full transition-all duration-500 ${barColorClass}`}
            style={{ width: `${visualBarWidth}%` }}
          />
        </div>

        {/* Over Budget Warning Banner */}
        {isOver && (
          <div
            data-testid="over-budget-badge"
            className="mt-3 flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-lg text-xs"
          >
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Over Budget</span>
              <span>Project exceeds approved BOQ envelope by {formatPKR(Number(project.budgetVariance) < 0 ? Math.abs(Number(project.budgetVariance)) : Number(project.budgetVariance))}.</span>
            </div>
          </div>
        )}

        {/* High Burn Warning Banner */}
        {isHighBurn && (
          <div className="mt-3 flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Project has utilized over 80% of its approved BOQ envelope.</span>
          </div>
        )}

        {/* General Ledger Drill-Down Action */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-3">
          <span className="text-slate-400">GL Cost Center</span>
          <button
            type="button"
            onClick={() => onViewTransactions?.(project.id)}
            className="font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer"
            data-testid={`view-transactions-${project.id}`}
          >
            View GL Entries &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
