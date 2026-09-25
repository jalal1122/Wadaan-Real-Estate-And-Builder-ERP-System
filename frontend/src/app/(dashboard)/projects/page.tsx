'use client';

import React, { useState, useMemo } from 'react';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectCardSkeleton } from '@/components/projects/ProjectCardSkeleton';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { ProjectTransactionDrawer } from '@/components/projects/ProjectTransactionDrawer';
import { formatPKR } from '@/lib/formatters';
import { Plus, Building2, Search, AlertTriangle, Layers, DollarSign } from 'lucide-react';

type FilterTab = 'ALL' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';

export default function ProjectsPage() {
  const { data: projects = [], isLoading, isError, error, refetch } = useProjects();
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Extract existing prefixes for collision prevention
  const existingPrefixes = useMemo(() => {
    return projects.map((p) => p.projectPrefix.toUpperCase());
  }, [projects]);

  // Filter projects by tab and search
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Tab filter
      if (activeTab !== 'ALL' && project.status !== activeTab) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = project.projectName.toLowerCase().includes(query);
        const matchesPrefix = project.projectPrefix.toLowerCase().includes(query);
        return matchesName || matchesPrefix;
      }
      return true;
    });
  }, [projects, activeTab, searchQuery]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    let totalBOQ = 0;
    let totalSpent = 0;
    let overBudgetCount = 0;

    for (const p of projects) {
      totalBOQ += Number(p.masterBOQ) || 0;
      totalSpent += Number(p.spentToDate) || 0;
      if (p.isOverBudget) {
        overBudgetCount++;
      }
    }

    return { totalBOQ, totalSpent, overBudgetCount, count: projects.length };
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Projects &amp; WIP
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor live capital expenditure against approved BOQ envelopes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Aggregate Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Projects
            </span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            {metrics.count}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Approved BOQ
            </span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatPKR(metrics.totalBOQ)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Live WIP (Spent)
            </span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {formatPKR(metrics.totalSpent)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Over Budget
            </span>
            <AlertTriangle className={`w-4 h-4 ${metrics.overBudgetCount > 0 ? 'text-red-500' : 'text-slate-400'}`} />
          </div>
          <p
            className={`text-xl font-bold font-mono mt-1 ${
              metrics.overBudgetCount > 0 ? 'text-red-600' : 'text-slate-900'
            }`}
          >
            {metrics.overBudgetCount}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
              activeTab === 'ACTIVE'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Active ({projects.filter((p) => p.status === 'ACTIVE').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ON_HOLD')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
              activeTab === 'ON_HOLD'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            On Hold ({projects.filter((p) => p.status === 'ON_HOLD').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
              activeTab === 'COMPLETED'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Completed ({projects.filter((p) => p.status === 'COMPLETED').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects or prefix..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 outline-hidden focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-all"
          />
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Error loading projects: {error?.message || 'Network error'}</span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="font-semibold underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredProjects.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-900 text-base mb-1">
            {searchQuery || activeTab !== 'ALL' ? 'No matching projects found' : 'No projects yet'}
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            {searchQuery || activeTab !== 'ALL'
              ? 'Try changing your filter options or search term.'
              : 'Create your first construction project to begin tracking BOQ utilization and live WIP costs.'}
          </p>
          {!searchQuery && activeTab === 'ALL' && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Initialize Project
            </button>
          )}
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && !isError && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onViewTransactions={(id) => setActiveProjectId(id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        existingPrefixes={existingPrefixes}
      />

      {/* Project GL Transactions Drill-Down Drawer */}
      <ProjectTransactionDrawer
        projectId={activeProjectId}
        onClose={() => setActiveProjectId(null)}
      />
    </div>
  );
}
