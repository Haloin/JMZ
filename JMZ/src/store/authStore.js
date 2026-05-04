import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useAuthStore = create(
  immer((set, get) => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: false,
    error: null,

    login: async (email, password) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
        return data;
      } catch (error) {
        set({ error: error.message, isLoading: false });
        throw error;
      }
    },

    register: async (name, email, password) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Registration failed');

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
        return data;
      } catch (error) {
        set({ error: error.message, isLoading: false });
        throw error;
      }
    },

    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null, isAuthenticated: false, error: null });
    },

    fetchUser: async () => {
      const token = get().token;
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('user', JSON.stringify(data));
          set({ user: data });
        } else if (response.status === 401) {
          get().logout();
        }
      } catch {
        // Network error â€” keep existing session
      }
    },

    updateTier: (tier) => {
      set((state) => {
        if (state.user) {
          state.user.tier = tier;
          localStorage.setItem('user', JSON.stringify(state.user));
        }
      });
    },
  }))
);


