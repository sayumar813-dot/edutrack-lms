'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'parent' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
  mustResetPassword?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, role: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await apiClient('/api/auth/me', { method: 'GET' });
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email: string, password: string, role: string) => {
    const data = await apiClient('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
    await fetchUser();
    return data;
  };

  const logout = async () => {
    await apiClient('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
