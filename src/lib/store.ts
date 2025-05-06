import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

type UserRole = 'superadmin' | 'faculty' | 'student';

interface UserState {
  user: User | null;
  role: UserRole | null;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  role: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  clearUser: () => set({ user: null, role: null }),
}));
