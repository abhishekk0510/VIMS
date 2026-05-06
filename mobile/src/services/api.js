import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your Railway backend URL
export const BASE_URL = 'https://YOUR_RAILWAY_APP.railway.app/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('vims_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue = [];

const processQueue = (error, token) => {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          orig.headers.Authorization = `Bearer ${token}`;
          return api(orig);
        });
      }
      orig._retry = true;
      isRefreshing = true;
      try {
        const rt = await AsyncStorage.getItem('vims_refresh_token');
        const r = await api.post('/auth/refresh', { refreshToken: rt });
        const newToken = r.data.data?.accessToken || r.data.accessToken;
        await AsyncStorage.setItem('vims_access_token', newToken);
        processQueue(null, newToken);
        orig.headers.Authorization = `Bearer ${newToken}`;
        return api(orig);
      } catch (e) {
        processQueue(e, null);
        await AsyncStorage.multiRemove(['vims_access_token', 'vims_refresh_token', 'vims_user']);
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
