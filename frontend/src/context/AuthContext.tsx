import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { post, userKey, venueFromPath } from '../api/client';

export interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
  email: string;
  mustChangePassword?: boolean;
  exp: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Tokens used to live in localStorage; they are httpOnly cookies now, so drop any left behind.
Object.keys(localStorage).filter((k) => k.startsWith('jwt:')).forEach((k) => localStorage.removeItem(k));

function readUser(key: string): AuthUser | null {
  try {
    const user = JSON.parse(localStorage.getItem(key) ?? 'null') as AuthUser | null;
    return user && user.exp * 1000 > Date.now() ? user : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const key = userKey(venueFromPath(useLocation().pathname));
  // Only the token's non-secret claims are kept here, for the UI and route guards. The token itself is an
  // httpOnly cookie that page scripts can't read, and the API enforces it.
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const user = readUser(key);

  const login = (u: AuthUser) => {
    localStorage.setItem(key, JSON.stringify(u));
    rerender();
  };

  const logout = () => {
    post('/auth/logout').catch(() => {});
    localStorage.removeItem(key);
    rerender();
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
