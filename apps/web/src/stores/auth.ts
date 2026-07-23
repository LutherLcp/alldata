/**
 * 认证状态管理
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserInfo, ProjectSimple } from '@alldata/shared/types/index.js';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  userInfo: UserInfo | null;
  isAuthenticated: boolean;
  loading: boolean;

  setAuth: (data: { token: string; refresh_token: string; user_info: UserInfo }) => void;
  setUserInfo: (info: UserInfo) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      userInfo: null,
      isAuthenticated: false,
      loading: true,

      setAuth: (data) =>
        set({
          token: data.token,
          refreshToken: data.refresh_token,
          userInfo: data.user_info,
          isAuthenticated: true,
          loading: false,
        }),

      setUserInfo: (info) =>
        set({ userInfo: info, isAuthenticated: true }),

      logout: () =>
        set({
          token: null,
          refreshToken: null,
          userInfo: null,
          isAuthenticated: false,
          loading: false,
        }),

      setLoading: (loading) => set({ loading }),

      checkAuth: () => {
        const { token } = get();
        if (token) {
          set({ isAuthenticated: true, loading: false });
          return true;
        }
        set({ isAuthenticated: false, loading: false });
        return false;
      },
    }),
    {
      name: 'alldata-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        userInfo: state.userInfo,
      }),
    },
  ),
);
