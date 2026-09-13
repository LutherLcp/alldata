/**
 * 媒体平台/广告投放配置 UI 状态管理
 */
import { create } from 'zustand';

export type MediaPlatform = 'google' | 'facebook' | 'tiktok' | 'meta' | 'asa';

interface MediaState {
  activePlatform: MediaPlatform;
  selectedAccounts: string[];
  selectedCampaigns: string[];
  currency: string;

  setActivePlatform: (platform: MediaPlatform) => void;
  setSelectedAccounts: (accounts: string[]) => void;
  setSelectedCampaigns: (campaigns: string[]) => void;
  setCurrency: (currency: string) => void;
  resetMediaFilters: () => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  activePlatform: 'google',
  selectedAccounts: [],
  selectedCampaigns: [],
  currency: 'USD',

  setActivePlatform: (activePlatform) =>
    set({ activePlatform, selectedAccounts: [], selectedCampaigns: [] }),
  setSelectedAccounts: (selectedAccounts) => set({ selectedAccounts }),
  setSelectedCampaigns: (selectedCampaigns) => set({ selectedCampaigns }),
  setCurrency: (currency) => set({ currency }),
  resetMediaFilters: () => set({ selectedAccounts: [], selectedCampaigns: [] }),
}));
