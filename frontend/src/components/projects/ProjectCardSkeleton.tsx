import React from 'react';

export const ProjectCardSkeleton: React.FC = () => {
  return (
    <div
      data-testid="project-card-skeleton"
      className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4 animate-pulse"
    >
      <div className="flex justify-between items-start border-b border-slate-100 pb-4">
        <div className="space-y-2">
          <div className="h-5 bg-slate-200 rounded w-40"></div>
          <div className="h-4 bg-slate-100 rounded w-16"></div>
        </div>
        <div className="h-6 bg-slate-200 rounded-full w-20"></div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-2">
        <div>
          <div className="h-3 bg-slate-100 rounded w-24 mb-2"></div>
          <div className="h-5 bg-slate-200 rounded w-32"></div>
        </div>
        <div>
          <div className="h-3 bg-slate-100 rounded w-24 mb-2"></div>
          <div className="h-5 bg-slate-200 rounded w-32"></div>
        </div>
      </div>

      <div className="mt-auto pt-2">
        <div className="flex justify-between mb-2">
          <div className="h-3 bg-slate-100 rounded w-16"></div>
          <div className="h-3 bg-slate-200 rounded w-12"></div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2"></div>
      </div>
    </div>
  );
};
