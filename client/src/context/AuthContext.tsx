import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { AuthContext, User } from './AuthContextCore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('hcm_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hcm_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await apiFetch<User>('/auth/me');
        setUser(me);
        localStorage.setItem('hcm_user', JSON.stringify(me));
      } catch (err) {
        console.error('Failed to load user profile, clearing session:', err);
        localStorage.removeItem('hcm_token');
        localStorage.removeItem('hcm_user');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('hcm_token', newToken);
    localStorage.setItem('hcm_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('hcm_token');
    localStorage.removeItem('hcm_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const updateUser = (updated: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      localStorage.setItem('hcm_user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
