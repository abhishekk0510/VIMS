import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
});

// Attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('vims_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let refreshing = false;
let queue = [];

api.interceptors.response.use(
  res => res,
  async err => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      if (refreshing) {
        return new Promise((res, rej) => queue.push({ res, rej }))
          .then(token => { orig.headers.Authorization = `Bearer ${token}`; return api(orig); });
      }
      orig._retry = true;
      refreshing = true;
      try {
        const rt = localStorage.getItem('vims_refresh_token');
        if (!rt) throw new Error('No refresh token');
        const r = await axios.post('/api/auth/refresh', { refreshToken: rt });
        const newToken = r.data.data.accessToken;
        localStorage.setItem('vims_access_token', newToken);
        queue.forEach(p => p.res(newToken));
        queue = [];
        orig.headers.Authorization = `Bearer ${newToken}`;
        return api(orig);
      } catch (e) {
        queue.forEach(p => p.rej(e));
        queue = [];
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
