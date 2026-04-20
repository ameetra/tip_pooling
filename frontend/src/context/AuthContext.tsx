import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/client';

interface JwtPayload {
  sub: string;
  tenantId: string;
  role: string;
  email: string;
  exp: number;
}

interface AuthContextValue {
  token: string | null;
  user: JwtPayload | null;
  login: (jwt: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseJwt(token: string): JwtPayload | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('jwt'));
  const [user, setUser] = useState<JwtPayload | null>(() => {
    const t = localStorage.getItem('jwt');
    return t ? parseJwt(t) : null;
  });

  useEffect(() => {
    if (!token) {
      api.defaults.headers.common['Authorization'] = '';
      return;
    }
    const payload = parseJwt(token);
    // Auto-logout if token is expired
    if (payload && payload.exp * 1000 < Date.now()) {
      logout();
      return;
    }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(payload);
  }, [token]);

  const login = (jwt: string) => {
    localStorage.setItem('jwt', jwt);
    setToken(jwt);
    api.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
    setUser(parseJwt(jwt));
  };

  const logout = () => {
    localStorage.removeItem('jwt');
    setToken(null);
    setUser(null);
    api.defaults.headers.common['Authorization'] = '';
  };

  return <AuthContext.Provider value={{ token, user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
