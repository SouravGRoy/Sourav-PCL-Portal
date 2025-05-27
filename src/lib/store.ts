import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { UserRole } from '@/types';

interface UserState {
  user: User | null;
  role: UserRole | null;
  name: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole | null) => void;
  setName: (name: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  role: null,
  name: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setName: (name) => set({ name }),
  setLoading: (isLoading) => set({ isLoading }),
  clearUser: () => set({ user: null, role: null, name: null }),
}));
