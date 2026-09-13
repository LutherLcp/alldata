import { tagApi } from '@/services-new/tag';
/**
 * 标签管理 — TanStack Query Hooks
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tagKeys } from './keys';

export function useTagList(projectId: number, tagType?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: tagKeys.list(projectId, tagType),
    queryFn: () => tagApi.list(projectId, tagType),
    enabled: options?.enabled ?? projectId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTagDetail(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: tagKeys.detail(id),
    queryFn: () => tagApi.get(id),
    enabled: options?.enabled ?? id > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTagMutations() {
  const queryClient = useQueryClient();

  const createTag = useMutation({
    mutationFn: (data: any) => tagApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  });

  const updateTag = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => tagApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  });

  const deleteTag = useMutation({
    mutationFn: (id: number) => tagApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  });

  const refreshTag = useMutation({
    mutationFn: (id: number) => tagApi.refresh(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.detail(id) });
    },
  });

  return { createTag, updateTag, deleteTag, refreshTag };
}
