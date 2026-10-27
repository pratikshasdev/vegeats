import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

interface PreferencesState {
  theme: ThemePreference;
  /** Diet tags used to highlight matching dishes. Synced to the profile when signed in. */
  dietTags: string[];
  onboarded: boolean;
  setTheme: (theme: ThemePreference) => void;
  setDietTags: (tags: string[]) => void;
  toggleDietTag: (tag: string) => void;
  completeOnboarding: () => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      dietTags: [],
      onboarded: false,
      setTheme: (theme) => set({ theme }),
      setDietTags: (dietTags) => set({ dietTags: [...new Set(dietTags)] }),
      toggleDietTag: (tag) => {
        const current = get().dietTags;
        set({ dietTags: current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag] });
      },
      completeOnboarding: () => set({ onboarded: true }),
    }),
    {
      name: 'vegeats-preferences',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
