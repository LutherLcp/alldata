/**
 * 全局状态管理
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectSimple } from '@alldata/shared/types/index.js';

interface GlobalState {
  currentProject: ProjectSimple | null;
  projects: ProjectSimple[];
  theme: 'light' | 'dark';
  language: string;
  sidebarCollapsed: boolean;

  setCurrentProject: (project: ProjectSimple) => void;
  setProjects: (projects: ProjectSimple[]) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: string) => void;
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

      setCurrentProject: (project) => set({ currentProject: project }),
      setProjects: (projects) => set({ projects }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'alldata-global',
      partialize: (state) => ({
        currentProject: state.currentProject,
        theme: state.theme,
        language: state.language,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
