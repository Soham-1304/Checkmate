import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './endpoints';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ── Auth Interceptor
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

// ── Retry Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config || config._retryCount >= 2) {
      return Promise.reject(error);
    }
    config._retryCount = (config._retryCount || 0) + 1;
    await new Promise((r) => setTimeout(r, 1000 * config._retryCount));
    return apiClient(config);
  }
);

export default apiClient;
