import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext(null);

const KEYS = {
  ACCESS: 'vims_access_token',
  REFRESH: 'vims_refresh_token',
  USER: 'vims_user',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEYS.USER)
      .then(stored => { if (stored) setUser(JSON.parse(stored)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const payload = res.data.data || res.data;
    const { accessToken, refreshToken, user: u } = payload;
    await AsyncStorage.setItem(KEYS.ACCESS, accessToken);
    await AsyncStorage.setItem(KEYS.REFRESH, refreshToken);
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(u));
    setUser(u);
    return u;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    await AsyncStorage.multiRemove([KEYS.ACCESS, KEYS.REFRESH, KEYS.USER]);
    setUser(null);
  };

  const switchTenant = async (tenantId) => {
    const res = await api.post(`/auth/switch-tenant/${tenantId}`);
    const payload = res.data.data || res.data;
    const { accessToken, user: u } = payload;
    await AsyncStorage.setItem(KEYS.ACCESS, accessToken);
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(u));
    setUser(u);
    return u;
  };

  const hasModule = (moduleKey) => {
    if (!user) return false;
    if (['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return true;
    return Array.isArray(user.modules) && user.modules.includes(moduleKey);
  };

  const accessibleTenants =
    user?.accessibleTenantIds?.map((id, i) => ({
      id,
      name: user.accessibleTenantNames?.[i] || id,
    })) || [];

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        switchTenant,
        hasModule,
        tenantId: user?.tenantId || null,
        tenantName: user?.tenantName || null,
        accessibleTenants,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
