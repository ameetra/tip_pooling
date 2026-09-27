import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { tokenKey, venueFromPath } from '../api/client';

interface JwtPayload {
  sub: string;
  tenantId: string;
  role: string;
  email: string;
  mustChangePassword?: boolean;
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
  const key = tokenKey(venueFromPath(useLocation().pathname));
  // Storage is the source of truth (the API client reads it too); this just re-renders after login/logout.
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const stored = localStorage.getItem(key);
  const parsed = stored ? parseJwt(stored) : null;
  const valid = parsed && parsed.exp * 1000 > Date.now();
  const token = valid ? stored : null;
  const user = valid ? parsed : null;

  const login = (jwt: string) => {
    localStorage.setItem(key, jwt);
    rerender();
  };

  const logout = () => {
    localStorage.removeItem(key);
    rerender();
  };

  return <AuthContext.Provider value={{ token, user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
