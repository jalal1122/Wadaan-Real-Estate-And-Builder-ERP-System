import React, { useState, useEffect } from 'react';
import { ProjectItem } from '@/features/projects/types';
import { useUpdateProject } from '@/features/projects/hooks/useProjects';
import { formatPKR } from '@/lib/formatters';
import { X, Building2, AlertCircle, Loader2, DollarSign, Lock } from 'lucide-react';

interface EditProjectModalProps {
  project: ProjectItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const [projectName, setProjectName] = useState('');
  const [masterBOQ, setMasterBOQ] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    projectName?: string;
    masterBOQ?: string;
    form?: string;
  }>({});

  const updateProjectMutation = useUpdateProject();

  useEffect(() => {
    if (project) {
      setProjectName(project.projectName || '');
      setMasterBOQ(project.masterBOQ ? String(project.masterBOQ) : '');
      setFieldErrors({});
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof fieldErrors = {};

    if (!projectName.trim()) {
      errors.projectName = 'Project name cannot be empty';
    }

    const numBOQ = parseFloat(masterBOQ);
    if (isNaN(numBOQ) || numBOQ < 0) {
      errors.masterBOQ = 'Master BOQ budget must be a non-negative number';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    updateProjectMutation.mutate(
      {
        id: project.id,
        payload: {
          projectName: projectName.trim(),
          masterBOQ: numBOQ,
        },
      },
      {
        onSuccess: () => {
          setFieldErrors({});
          onClose();
        },
        onError: (err: any) => {
          const apiError = err?.response?.data?.error;
          setFieldErrors((prev) => ({
            ...prev,
            form: apiError?.message || err.message || 'Failed to update project',
          }));
        },
      }
    );
  };

  const spentNum = Number(project.spentToDate || 0);
  const inputBOQNum = parseFloat(masterBOQ) || 0;
  const willBeOverBudget = inputBOQNum > 0 && spentNum > inputBOQNum;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Edit Project Details</h3>
              <p className="text-xs text-slate-500">Update project name and approved budget envelope</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fieldErrors.form && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fieldErrors.form}</span>
            </div>
          )}

          {/* Project Prefix (Immutable Code) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <span>Project Code (Prefix)</span>
              <Lock className="w-3 h-3 text-slate-400" />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled
                value={project.projectPrefix}
                className="w-full px-3.5 py-2 text-sm font-mono font-bold bg-slate-100 text-slate-500 rounded-lg border border-slate-200 cursor-not-allowed uppercase"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Prefix is permanently assigned for invoice and voucher sequence uniqueness.
            </p>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Project Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Wadaan Heights Tower A"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (fieldErrors.projectName) {
                  setFieldErrors((prev) => ({ ...prev, projectName: undefined }));
                }
              }}
              className={`w-full px-3.5 py-2 text-sm rounded-lg border outline-hidden transition-all ${
                fieldErrors.projectName
                  ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20'
                  : 'border-slate-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]'
              }`}
            />
            {fieldErrors.projectName && (
              <p className="text-[11px] text-red-600 mt-1">{fieldErrors.projectName}</p>
            )}
          </div>

          {/* Master BOQ (Approved Budget) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Approved Master BOQ (Budget) *
              </label>
              {spentNum > 0 && (
                <span className="text-[11px] text-slate-500">
                  Spent to date: <strong className="font-mono text-slate-800">{formatPKR(spentNum)}</strong>
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={masterBOQ}
                onChange={(e) => {
                  setMasterBOQ(e.target.value);
                  if (fieldErrors.masterBOQ) {
                    setFieldErrors((prev) => ({ ...prev, masterBOQ: undefined }));
                  }
                }}
                className={`w-full pl-9 pr-3.5 py-2 text-sm font-mono rounded-lg border outline-hidden transition-all ${
                  fieldErrors.masterBOQ
                    ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20'
                    : 'border-slate-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]'
                }`}
              />
            </div>
            {fieldErrors.masterBOQ && (
              <p className="text-[11px] text-red-600 mt-1">{fieldErrors.masterBOQ}</p>
            )}
            {willBeOverBudget && (
              <div className="mt-2 flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Notice: New budget ({formatPKR(inputBOQNum)}) is lower than spent-to-date ({formatPKR(spentNum)}). The project will display an over-budget status.
                </span>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateProjectMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-2"
            >
              {updateProjectMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
