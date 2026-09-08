import { create } from 'zustand';
import { UserModel } from '../models/types';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/client';
import { Endpoints } from '../api/endpoints';

interface AuthState {
  user: UserModel | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await apiClient.post(Endpoints.loginJson, { email, password });
      await SecureStore.setItemAsync('access_token', data.access_token);
      if (data.refresh_token) {
        await SecureStore.setItemAsync('refresh_token', data.refresh_token);
      }
      const me = await apiClient.get(Endpoints.me);
      const user: UserModel = {
        id: String(me.data.id ?? me.data.user_id ?? email),
        email: me.data.email ?? email,
        name: me.data.name ?? email.split('@')[0],
        role: data.role ?? me.data.role ?? 'OFFICER',
      };
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  logout: async () => {
    try {
      await apiClient.post(Endpoints.logout);
    } catch {}
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) return false;
    try {
      const me = await apiClient.get(Endpoints.me);
      set({
        isAuthenticated: true,
        user: {
          id: String(me.data.id ?? me.data.user_id ?? ''),
          email: me.data.email ?? '',
          name: me.data.name ?? 'Officer',
          role: me.data.role ?? 'OFFICER',
        },
      });
      return true;
    } catch {
      await SecureStore.deleteItemAsync('access_token');
      return false;
    }
  },
}));
