import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('vims_user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user: u } = res.data.data;
    localStorage.setItem('vims_access_token', accessToken);
    localStorage.setItem('vims_refresh_token', refreshToken);
    localStorage.setItem('vims_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('vims_access_token');
    localStorage.removeItem('vims_refresh_token');
    localStorage.removeItem('vims_user');
    setUser(null);
  }, []);

  // Switch active tenant context — issues a new JWT for that tenant
  const switchTenant = useCallback(async (tenantId) => {
    const res = await api.post(`/auth/switch-tenant/${tenantId}`);
    const { accessToken, user: u } = res.data.data;
    localStorage.setItem('vims_access_token', accessToken);
    localStorage.setItem('vims_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  // Check if a module is enabled for the current user
  const hasModule = useCallback((moduleKey) => {
    if (!user) return false;
    if (!user.modules || user.modules.length === 0) return false;
    return user.modules.includes(moduleKey);
  }, [user]);

  // Update stored user (e.g. after admin updates permissions)
  const refreshUser = useCallback((updatedUser) => {
    localStorage.setItem('vims_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      switchTenant,
      hasModule,
      refreshUser,
      tenantId:   user?.tenantId   ?? null,
      tenantName: user?.tenantName ?? null,
      accessibleTenants: user?.accessibleTenantIds?.map((id, i) => ({
        id,
        name: user.accessibleTenantNames?.[i] ?? id,
      })) ?? [],
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
