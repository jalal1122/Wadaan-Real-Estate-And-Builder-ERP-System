'use client';

import React, { useState, useEffect } from 'react';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useProjectLedger } from '../hooks/useReports';
import { formatPKR, formatDate } from '@/lib/format';
import { Building2, Receipt, AlertCircle } from 'lucide-react';

interface ProjectCostLedgerProps {
  startDate?: string;
  endDate?: string;
  selectedProjectId?: string;
  onProjectChange?: (projectId: string) => void;
}

export const ProjectCostLedger: React.FC<ProjectCostLedgerProps> = ({
  startDate,
  endDate,
  selectedProjectId: initialProjectId,
  onProjectChange,
}) => {
  const { data: projects = [], isLoading: isLoadingProjects } = useProjects();
  const [projectId, setProjectId] = useState<string>(initialProjectId || '');

  // Default to first active project if none selected
  useEffect(() => {
    if (!projectId && projects.length > 0) {
      const firstId = projects[0].id;
      setProjectId(firstId);
      if (onProjectChange) onProjectChange(firstId);
    }
  }, [projects, projectId, onProjectChange]);

  const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setProjectId(val);
    if (onProjectChange) onProjectChange(val);
  };

  const { data: ledger, isLoading: isLoadingLedger, isError } = useProjectLedger(
    projectId || undefined,
    startDate,
    endDate
  );

  const selectedProject = projects.find((p) => p.id === projectId);

  return (
    <div className="space-y-6" data-testid="project-cost-ledger">
      {/* Top Controls: Project Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Project Cost Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Line-by-line construction expenses, material supplies, and subcontractor bills.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="project-select" className="text-xs font-medium text-slate-600 whitespace-nowrap">
            Select Project:
          </label>
          <select
            id="project-select"
            data-testid="project-select-dropdown"
            value={projectId}
            onChange={handleProjectSelect}
            disabled={isLoadingProjects}
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 px-3 py-1.5 shadow-2xs font-medium min-w-[200px]"
          >
            {projects.length === 0 && (
              <option value="">No projects available</option>
            )}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectName} {p.projectPrefix ? `(${p.projectPrefix})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ledger Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoadingLedger ? (
          <div className="p-8 space-y-4 animate-pulse">
            <div className="h-6 bg-slate-100 rounded w-1/4" />
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900">Failed to load project cost ledger</p>
            <p className="text-xs text-slate-500 mt-1">Please try again or select a different project.</p>
          </div>
        ) : !projectId ? (
          <div className="p-12 text-center text-slate-500">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">Please select a construction project above</p>
          </div>
        ) : ledger?.lineItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No construction bills found for {selectedProject?.projectName || 'this project'}</p>
            <p className="text-xs text-slate-400 mt-1">
              Expense bills assigned to this project will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ledger?.lineItems.map((item) => (
                  <tr key={item.lineItemId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                      {formatDate(item.billDate)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {item.vendorName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {item.invoiceNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={item.description}>
                      {item.description}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {Number(item.quantity).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {formatPKR(Number(item.unitPrice))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatPKR(Number(item.lineTotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900 text-sm">
                  <td colSpan={6} className="py-4 px-4 text-right uppercase tracking-wider text-xs text-slate-600 font-semibold">
                    Total Project Cost:
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-emerald-700 text-base" data-testid="project-total-cost">
                    {formatPKR(Number(ledger?.totalProjectCost || 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
