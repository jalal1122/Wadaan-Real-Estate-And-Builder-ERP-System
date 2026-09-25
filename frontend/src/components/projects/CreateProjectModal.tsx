import React, { useState } from 'react';
import { useCreateProject } from '@/features/projects/hooks/useProjects';
import { X, Building2, AlertCircle, Loader2 } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPrefixes: string[];
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  existingPrefixes,
}) => {
  const [projectName, setProjectName] = useState('');
  const [projectPrefix, setProjectPrefix] = useState('');
  const [masterBOQ, setMasterBOQ] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    projectName?: string;
    projectPrefix?: string;
    masterBOQ?: string;
    form?: string;
  }>({});

  const createProjectMutation = useCreateProject();

  if (!isOpen) return null;

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().trim();
    setProjectPrefix(val);
    if (fieldErrors.projectPrefix) {
      setFieldErrors((prev) => ({ ...prev, projectPrefix: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof fieldErrors = {};

    if (!projectName.trim()) {
      errors.projectName = 'Project name is required';
    }

    if (!projectPrefix.trim()) {
      errors.projectPrefix = 'Project prefix is required';
    } else if (existingPrefixes.includes(projectPrefix.trim().toUpperCase())) {
      errors.projectPrefix = `Prefix '${projectPrefix}' is already assigned to another project`;
    }

    const numBOQ = parseFloat(masterBOQ);
    if (isNaN(numBOQ) || numBOQ <= 0) {
      errors.masterBOQ = 'Master BOQ must be a positive number';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    createProjectMutation.mutate(
      {
        projectName: projectName.trim(),
        projectPrefix: projectPrefix.trim().toUpperCase(),
        masterBOQ: numBOQ,
      },
      {
        onSuccess: () => {
          setProjectName('');
          setProjectPrefix('');
          setMasterBOQ('');
          setFieldErrors({});
          onClose();
        },
        onError: (err: any) => {
          const apiError = err?.response?.data?.error;
          const errorCode = apiError?.code;
          if (errorCode === 'DUPLICATE_PROJECT_PREFIX') {
            setFieldErrors((prev) => ({
              ...prev,
              projectPrefix: `Prefix '${projectPrefix}' already exists in database`,
            }));
          } else {
            setFieldErrors((prev) => ({
              ...prev,
              form: apiError?.message || err.message || 'Failed to initialize project',
            }));
          }
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Initialize New Project</h3>
              <p className="text-xs text-slate-500">Create a construction cost center and assign BOQ</p>
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

          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Project Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Wadaan Heights Tower B"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (fieldErrors.projectName) {
                  setFieldErrors((prev) => ({ ...prev, projectName: undefined }));
                }
              }}
              className={`w-full px-3.5 py-2 text-sm rounded-lg border outline-hidden transition-all ${
                fieldErrors.projectName
                  ? 'border-red-500 ring-1 ring-red-500'
                  : 'border-slate-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]'
              }`}
            />
            {fieldErrors.projectName && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {fieldErrors.projectName}
              </p>
            )}
          </div>

          {/* Project Prefix */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Project Prefix * (Uppercase Code)
            </label>
            <input
              type="text"
              placeholder="e.g. WHT, DHA, EXV"
              value={projectPrefix}
              onChange={handlePrefixChange}
              maxLength={8}
              className={`w-full px-3.5 py-2 text-sm font-mono uppercase tracking-wider rounded-lg border outline-hidden transition-all ${
                fieldErrors.projectPrefix
                  ? 'border-red-500 ring-1 ring-red-500'
                  : 'border-slate-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]'
              }`}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Short identifier used for invoice tagging and general ledger references.
            </p>
            {fieldErrors.projectPrefix && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {fieldErrors.projectPrefix}
              </p>
            )}
          </div>

          {/* Master BOQ */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Master BOQ Envelope (PKR) *
            </label>
            <input
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 50000000"
              value={masterBOQ}
              onChange={(e) => {
                setMasterBOQ(e.target.value);
                if (fieldErrors.masterBOQ) {
                  setFieldErrors((prev) => ({ ...prev, masterBOQ: undefined }));
                }
              }}
              className={`w-full px-3.5 py-2 text-sm font-mono rounded-lg border outline-hidden transition-all ${
                fieldErrors.masterBOQ
                  ? 'border-red-500 ring-1 ring-red-500'
                  : 'border-slate-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]'
              }`}
            />
            {fieldErrors.masterBOQ && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {fieldErrors.masterBOQ}
              </p>
            )}
          </div>

          {/* Action Buttons */}
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
              disabled={createProjectMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-2"
            >
              {createProjectMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Initialize Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
