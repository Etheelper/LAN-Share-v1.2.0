import { create } from 'zustand';
import type { UserResponse } from '@/types';
import { authApi } from '@/services/auth';

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, nickname?: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  loading: false,

  login: async (username, password) => {
    set({ loading: true });
    try {
      const res = await authApi.login({ username, password });
      localStorage.setItem('token', res.access_token);
      localStorage.setItem('user', JSON.stringify(res.user));
      set({ token: res.access_token, user: res.user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  register: async (username, password, nickname) => {
    set({ loading: true });
    try {
      await authApi.register({ username, password, nickname });
      set({ loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },

  fetchMe: async () => {
    try {
      const user = await authApi.getMe();
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ token: null, user: null });
    }
  },

  init: async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const user = await authApi.getMe();
        localStorage.setItem('user', JSON.stringify(user));
        set({ token, user });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ token: null, user: null });
      }
    }
  },
}));
