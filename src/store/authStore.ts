import { create } from 'zustand';
import type { User, UserRole } from '../types';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const defaultOwner: User = {
  id: 'user-1',
  name: 'James Harrison',
  email: 'james@yachtworx.io',
  role: 'owner',
  avatar: 'https://randomuser.me/api/portraits/men/41.jpg',
  location: 'Marina del Rey, CA',
};

const defaultProvider: User = {
  id: 'prov-1',
  name: 'Marcus Chen',
  email: 'marcus@pacificmarine.com',
  role: 'provider',
  avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  location: 'Marina del Rey, CA',
};

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: defaultOwner,
  isAuthenticated: true,
  login: (user) => set({ currentUser: user, isAuthenticated: true }),
  logout: () => set({ currentUser: null, isAuthenticated: false }),
  switchRole: (role) =>
    set((state) => ({
      currentUser: state.currentUser
        ? {
            ...(role === 'owner' ? defaultOwner : defaultProvider),
            role,
          }
        : null,
    })),
}));
