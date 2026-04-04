/**
 * Auth Store — TRD Section 4.1
 *
 * Dual-mode:
 *   isDemoMode=true  → mock users, simulated delays, no network calls
 *   isDemoMode=false → real Supabase Auth (email/password, JWT, email verification)
 */

import { create } from 'zustand';
import type { User, UserRole } from '../types';
import { supabase, isDemoMode } from '../lib/supabase';
import { rowToUser } from '../lib/supabaseTypes';

// ─── Password Validation (TRD 3.1) ───────────────────────────────────────────

export interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  isValid: boolean;
}

export function validatePassword(password: string): PasswordValidation {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return { minLength, hasUppercase, hasNumber, isValid: minLength && hasUppercase && hasNumber };
}

// ─── Auth Flow States ─────────────────────────────────────────────────────────

export type AuthFlow =
  | 'idle'
  | 'login'
  | 'registering'
  | 'verify_email'
  | 'authenticated'
  | 'password_reset'
  | 'error';

// ─── Demo Default Users ───────────────────────────────────────────────────────

const defaultOwner: User = {
  id: 'user-1',
  firstName: 'James',
  lastName: 'Harrison',
  name: 'James Harrison',
  email: 'james@yachtworx.io',
  role: 'owner',
  emailVerified: true,
  avatarUrl: 'https://randomuser.me/api/portraits/men/41.jpg',
  avatar: 'https://randomuser.me/api/portraits/men/41.jpg',
  phone: '+1 310 555 0147',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const defaultProvider: User = {
  id: 'prov-1',
  firstName: 'Marcus',
  lastName: 'Rivera',
  name: 'Marcus Rivera',
  email: 'provider@yachtworx.com',
  role: 'provider',
  emailVerified: true,
  avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop',
  avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop',
  phone: '+1 310 555 0101',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const defaultMarina: User = {
  id: 'marina-owner-1',
  firstName: 'David',
  lastName: 'Park',
  name: 'David Park',
  email: 'marina@yachtworx.com',
  role: 'marina',
  emailVerified: true,
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
  phone: '+1 305 555 0101',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const defaultAdmin: User = {
  id: 'admin-1',
  firstName: 'Admin',
  lastName: 'User',
  name: 'Admin User',
  email: 'admin@yachtworx.com',
  role: 'admin',
  emailVerified: true,
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
  phone: '+1 310 555 0999',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// ─── Registration State ───────────────────────────────────────────────────────

export interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
}

// ─── Auth State ───────────────────────────────────────────────────────────────

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  emailVerified: boolean;
  authFlow: AuthFlow;
  pendingEmail: string | null;
  authError: string | null;
  isLoading: boolean;

  // Actions
  initAuth: () => Promise<void>;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegistrationData) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  switchRole: (role: UserRole) => void;
  clearError: () => void;
  setFlow: (flow: AuthFlow) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  // Start authenticated in demo mode so users land on the dashboard immediately
  currentUser: isDemoMode ? defaultOwner : null,
  isAuthenticated: isDemoMode,
  emailVerified: isDemoMode,
  authFlow: isDemoMode ? 'authenticated' : 'idle',
  pendingEmail: null,
  authError: null,
  isLoading: false,

  // ── initAuth ────────────────────────────────────────────────────────────────
  // Called once on app mount. In live mode, restores session from Supabase.
  initAuth: async () => {
    if (isDemoMode || !supabase) return;

    set({ isLoading: true });

    try {
      // Restore existing session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const user = profile ? rowToUser(profile) : null;
        set({
          currentUser: user,
          isAuthenticated: !!user,
          emailVerified: session.user.email_confirmed_at != null,
          authFlow: user ? 'authenticated' : 'idle',
        });

        // Load boats for this user
        if (user) {
          const { useBoatStore } = await import('./boatStore');
          await useBoatStore.getState().loadBoats(user.id);
        }
      }

      // Subscribe to auth state changes (token refresh, sign-out from another tab)
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          set({
            currentUser: null,
            isAuthenticated: false,
            emailVerified: false,
            authFlow: 'idle',
          });
          return;
        }
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session.user) {
          const { data: profile } = await supabase!
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profile) {
            const user = rowToUser(profile);
            set({
              currentUser: user,
              isAuthenticated: true,
              emailVerified: session.user.email_confirmed_at != null,
              authFlow: 'authenticated',
            });
          }
        }
      });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── login ───────────────────────────────────────────────────────────────────
  login: async (email, password, role) => {
    set({ isLoading: true, authError: null });

    if (isDemoMode || !supabase) {
      await new Promise(r => setTimeout(r, 800));
      const base =
        role === 'owner'    ? defaultOwner :
        role === 'provider' ? defaultProvider :
                              defaultAdmin;
      set({
        currentUser: { ...base, email },
        isAuthenticated: true,
        emailVerified: true,
        authFlow: 'authenticated',
        isLoading: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!profile) throw new Error('Profile not found. Please contact support.');

      const user = rowToUser(profile);
      set({
        currentUser: user,
        isAuthenticated: true,
        emailVerified: data.user.email_confirmed_at != null,
        authFlow: 'authenticated',
        isLoading: false,
      });

      // Load boats immediately after sign-in
      const { useBoatStore } = await import('./boatStore');
      await useBoatStore.getState().loadBoats(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      set({ authError: msg, isLoading: false, authFlow: 'error' });
    }
  },

  // ── logout ──────────────────────────────────────────────────────────────────
  logout: async () => {
    if (!isDemoMode && supabase) {
      await supabase.auth.signOut();
    }
    // Clear boats too
    const { useBoatStore } = await import('./boatStore');
    useBoatStore.getState().clearBoats();

    set({
      currentUser: null,
      isAuthenticated: false,
      emailVerified: false,
      authFlow: 'idle',
      pendingEmail: null,
    });
  },

  // ── register ────────────────────────────────────────────────────────────────
  register: async (data) => {
    set({ isLoading: true, authError: null });

    const validation = validatePassword(data.password);
    if (!validation.isValid) {
      set({ authError: 'Password does not meet requirements.', isLoading: false });
      return;
    }

    if (isDemoMode || !supabase) {
      await new Promise(r => setTimeout(r, 1000));
      set({ isLoading: false, authFlow: 'verify_email', pendingEmail: data.email });
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            role: data.role,
          },
        },
      });
      if (error) throw error;
      set({ isLoading: false, authFlow: 'verify_email', pendingEmail: data.email });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      set({ authError: msg, isLoading: false, authFlow: 'error' });
    }
  },

  // ── verifyEmail ─────────────────────────────────────────────────────────────
  verifyEmail: async (_token) => {
    set({ isLoading: true, authError: null });

    if (isDemoMode || !supabase) {
      await new Promise(r => setTimeout(r, 800));
      const { pendingEmail } = get();
      const newUser: User = {
        id: `user-${Date.now()}`,
        firstName: 'New',
        lastName: 'User',
        name: 'New User',
        email: pendingEmail || 'user@example.com',
        role: 'owner',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set({
        currentUser: newUser,
        isAuthenticated: true,
        emailVerified: true,
        authFlow: 'authenticated',
        pendingEmail: null,
        isLoading: false,
      });
      return;
    }

    // In live mode, Supabase handles email verification via a link in the email.
    // If we reach here with a token, verify via OTP.
    try {
      const { pendingEmail } = get();
      if (!pendingEmail) throw new Error('No pending email');
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: _token,
        type: 'email',
      });
      if (error) throw error;
      set({ isLoading: false });
      // onAuthStateChange will handle setting isAuthenticated
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      set({ authError: msg, isLoading: false });
    }
  },

  // ── resendVerification ──────────────────────────────────────────────────────
  resendVerification: async () => {
    set({ isLoading: true });
    const { pendingEmail } = get();

    if (!isDemoMode && supabase && pendingEmail) {
      await supabase.auth.resend({ type: 'signup', email: pendingEmail });
    } else {
      await new Promise(r => setTimeout(r, 600));
    }
    set({ isLoading: false });
  },

  // ── forgotPassword ──────────────────────────────────────────────────────────
  forgotPassword: async (email) => {
    set({ isLoading: true, authError: null });

    if (!isDemoMode && supabase) {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } else {
      await new Promise(r => setTimeout(r, 800));
    }
    set({ isLoading: false, authFlow: 'password_reset' });
  },

  // ── resetPassword ───────────────────────────────────────────────────────────
  resetPassword: async (_token, newPassword) => {
    set({ isLoading: true, authError: null });

    if (!isDemoMode && supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        set({ authError: error.message, isLoading: false });
        return;
      }
    } else {
      await new Promise(r => setTimeout(r, 800));
    }
    set({ isLoading: false, authFlow: 'idle' });
  },

  // ── updateProfile ───────────────────────────────────────────────────────────
  updateProfile: async (updates) => {
    set({ isLoading: true, authError: null });
    const { currentUser } = get();
    if (!currentUser) { set({ isLoading: false }); return; }

    if (!isDemoMode && supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: updates.firstName ?? currentUser.firstName,
          last_name: updates.lastName ?? currentUser.lastName,
          phone: updates.phone ?? currentUser.phone ?? null,
          avatar_url: updates.avatarUrl ?? currentUser.avatarUrl ?? null,
        })
        .eq('id', currentUser.id);

      if (error) {
        set({ authError: error.message, isLoading: false });
        return;
      }
    }

    set((state) => ({
      currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null,
      isLoading: false,
    }));
  },

  // ── switchRole (demo only) ──────────────────────────────────────────────────
  switchRole: (role) => {
    if (!isDemoMode) return; // no-op in live mode
    const user =
      role === 'owner'    ? defaultOwner :
      role === 'provider' ? defaultProvider :
      role === 'marina'   ? defaultMarina :
                            defaultAdmin;
    set({ currentUser: user });
  },

  clearError: () => set({ authError: null }),
  setFlow: (flow) => set({
    authFlow: flow,
    // When returning to idle, also clear pendingEmail so the verification
    // screen can't re-appear for a different user visiting /auth later.
    ...(flow === 'idle' ? { pendingEmail: null, authError: null } : {}),
  }),
}));
