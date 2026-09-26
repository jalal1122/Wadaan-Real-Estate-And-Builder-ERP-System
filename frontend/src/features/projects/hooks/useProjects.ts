import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProjects,
  fetchProjectById,
  createProject,
  updateProjectStatus,
  fetchProjectTransactions,
  fetchProjectReport
} from '../api/projectApi';
import { ProjectItem, CreateProjectPayload, ProjectStatus, ProjectTransactionsResponse, ProjectReportResponse } from '../types';

/**
 * Hook to fetch active projects and budget burn status for dashboard monitoring.
 */
export const useProjects = () => {
  return useQuery<ProjectItem[], Error>({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    retry: false,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Hook to fetch a single project by ID.
 */
export const useProjectById = (id: string | null | undefined) => {
  return useQuery<ProjectItem, Error>({
    queryKey: ['projects', id],
    queryFn: () => fetchProjectById(id!),
    enabled: !!id,
    retry: false,
  });
};

/**
 * Hook to fetch project GL transactions drill-down.
 */
export const useProjectTransactions = (id: string | null | undefined) => {
  return useQuery<ProjectTransactionsResponse, Error>({
    queryKey: ['projects', id, 'transactions'],
    queryFn: () => fetchProjectTransactions(id!),
    enabled: !!id,
    retry: false,
  });
};

/**
 * Hook to fetch comprehensive project report (receipts, vendor expenses, GL audit).
 */
export const useProjectReport = (id: string | null | undefined) => {
  return useQuery<ProjectReportResponse, Error>({
    queryKey: ['projects', id, 'report'],
    queryFn: () => fetchProjectReport(id!),
    enabled: !!id,
    retry: false,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to create a new project.
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation<ProjectItem, Error, CreateProjectPayload>({
    mutationFn: (payload: CreateProjectPayload) => createProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

/**
 * Hook to update a project's operational status.
 */
export const useUpdateProjectStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<ProjectItem, Error, { id: string; status: ProjectStatus }>({
    mutationFn: ({ id, status }) => updateProjectStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

