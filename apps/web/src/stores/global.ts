/**
 * 全局 UI 状态管理 (Zustand 客户端纯 UI 状态)
 */
import { tracker } from '@/utils/tracker';
import type { ProjectSimple } from '@alldata/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GlobalState {
  currentProject: ProjectSimple | null;
  projects: ProjectSimple[];
  theme: 'light' | 'dark';
  language: string;
  sidebarCollapsed: boolean;
  globalTimezone: string;

  setCurrentProject: (project: ProjectSimple) => void;
  setProjects: (projects: ProjectSimple[]) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: string) => void;
  setGlobalTimezone: (tz: string) => void;
  toggleSidebar: () => void;
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set) => ({
      currentProject: null,
      projects: [],
      theme: 'light',
      language: 'zh_CN',
      sidebarCollapsed: false,
      globalTimezone: 'UTC+8',

      setCurrentProject: (project) => {
        tracker.registerCommonProperties({
          $project_id: project.id,
          $project_name: project.name,
        });
        set({ currentProject: project });
      },
      setProjects: (projects) => set({ projects }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setGlobalTimezone: (globalTimezone) => set({ globalTimezone }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'alldata-global',
      partialize: (state) => ({
        currentProject: state.currentProject,
        theme: state.theme,
        language: state.language,
        sidebarCollapsed: state.sidebarCollapsed,
        globalTimezone: state.globalTimezone,
      }),
    },
  ),
);
