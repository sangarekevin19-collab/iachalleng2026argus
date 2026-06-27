import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  companyId: string | null;
  phone: string | null;
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  isHydrated: boolean;

  setTokens: (access: string, refresh: string) => void;
  setUser: (userId: string, companyId: string, phone: string) => void;
  setOnboardingComplete: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      companyId: null,
      phone: null,
      isAuthenticated: false,
      onboardingComplete: false,
      isHydrated: false,

      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh, isAuthenticated: true }),

      setUser: (userId, companyId, phone) =>
        set({ userId, companyId, phone }),

      setOnboardingComplete: () =>
        set({ onboardingComplete: true }),

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          userId: null,
          companyId: null,
          phone: null,
          isAuthenticated: false,
          onboardingComplete: false,
        });
        useAuthStore.persist.clearStorage();
      },
    }),
    {
      name: 'aura-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        userId: state.userId,
        companyId: state.companyId,
        phone: state.phone,
        isAuthenticated: state.isAuthenticated,
        onboardingComplete: state.onboardingComplete,
      }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ isHydrated: true });
      },
    },
  ),
);
