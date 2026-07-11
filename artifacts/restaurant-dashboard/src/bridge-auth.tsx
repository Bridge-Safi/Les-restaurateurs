/**
 * bridge-auth.tsx — Remplace @clerk/react — zéro dépendance externe
 * DESTINATION : artifacts/restaurant-dashboard/src/bridge-auth.tsx
 *
 * Même pattern que artifacts/grado-eats/src/bridge-auth.tsx (Bridge Eats),
 * adapté aux comptes restaurant (email + mot de passe uniquement).
 *
 * Hooks: useUser(), useAuth(), useBridgeAuth()
 * Provider: <AuthProvider>
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface BridgeUser {
  id: string;
  phone: string | null;
  email: string | null;
  name: string;
  role: 'restaurant';
  imageUrl: string;
  primaryPhoneNumber: { phoneNumber: string } | null;
  primaryEmailAddress: { emailAddress: string } | null;
}

interface AuthState {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: BridgeUser | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string, remember?: boolean) => Promise<void>;
  signUp: (email: string, password: string, name?: string, remember?: boolean) => Promise<void>;
  signOut: () => void;
  getToken: () => Promise<string | null>;
}

const TOKEN_KEY = 'bridge_restaurant_jwt';
const USER_KEY = 'bridge_restaurant_user_cache';

function authStore(remember: boolean): Storage {
  return remember ? localStorage : sessionStorage;
}
function readStoredAuth(): { token: string | null; userRaw: string | null } {
  const lsToken = localStorage.getItem(TOKEN_KEY);
  const lsUser = localStorage.getItem(USER_KEY);
  if (lsToken && lsUser) return { token: lsToken, userRaw: lsUser };
  const ssToken = sessionStorage.getItem(TOKEN_KEY);
  const ssUser = sessionStorage.getItem(USER_KEY);
  return { token: ssToken, userRaw: ssUser };
}
function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(USER_KEY);
}

/** Utilisé par useOrdersSSE.ts : EventSource ne peut pas envoyer de header
 *  Authorization, donc le token est passé en query param pour ce cas précis. */
export function getStoredToken(): string | null {
  return readStoredAuth().token;
}

const AuthContext = createContext<AuthContextValue>({
  isLoaded: false, isSignedIn: false, user: null, token: null,
  signIn: async () => {}, signUp: async () => {}, signOut: () => {},
  getToken: async () => null,
});

function normalizeUser(raw: any): BridgeUser {
  return {
    id: raw.id ?? '',
    phone: raw.phone ?? null,
    email: raw.email ?? null,
    name: raw.name ?? '',
    role: 'restaurant',
    imageUrl: raw.imageUrl ?? '',
    primaryPhoneNumber: raw.phone ? { phoneNumber: raw.phone } : null,
    primaryEmailAddress: raw.email ? { emailAddress: raw.email } : null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const { token: cachedToken, userRaw: cachedUser } = readStoredAuth();
      if (cachedToken && cachedUser) {
        return { isLoaded: false, isSignedIn: true, user: normalizeUser(JSON.parse(cachedUser)), token: cachedToken };
      }
    } catch {}
    return { isLoaded: false, isSignedIn: false, user: null, token: null };
  });

  useEffect(() => {
    const { token, userRaw } = readStoredAuth();
    if (!token) { setState({ isLoaded: true, isSignedIn: false, user: null, token: null }); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(raw => {
        if (raw?.id) {
          const user = normalizeUser(raw);
          const store = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
          store.setItem(USER_KEY, JSON.stringify(raw));
          setState({ isLoaded: true, isSignedIn: true, user, token });
        } else {
          clearStoredAuth();
          setState({ isLoaded: true, isSignedIn: false, user: null, token: null });
        }
      })
      .catch(() => {
        if (userRaw) setState(s => ({ ...s, isLoaded: true }));
        else setState({ isLoaded: true, isSignedIn: false, user: null, token: null });
      });
  }, []);

  const signIn = async (email: string, password: string, remember: boolean = true) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Identifiants incorrects.');
    const user = normalizeUser(data.user);
    clearStoredAuth();
    const store = authStore(remember);
    store.setItem(TOKEN_KEY, data.token);
    store.setItem(USER_KEY, JSON.stringify(data.user));
    setState({ isLoaded: true, isSignedIn: true, user, token: data.token });
  };

  const signUp = async (email: string, password: string, name?: string, remember: boolean = true) => {
    const r = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password, name: name?.trim() || '' }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Erreur lors de la création du compte.');
    const user = normalizeUser(data.user);
    clearStoredAuth();
    const store = authStore(remember);
    store.setItem(TOKEN_KEY, data.token);
    store.setItem(USER_KEY, JSON.stringify(data.user));
    setState({ isLoaded: true, isSignedIn: true, user, token: data.token });
  };

  const signOut = () => {
    clearStoredAuth();
    setState({ isLoaded: true, isSignedIn: false, user: null, token: null });
  };

  const getToken = async (): Promise<string | null> => localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(AuthContext);
  return { isLoaded: ctx.isLoaded, isSignedIn: ctx.isSignedIn, user: ctx.user };
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  return { isLoaded: ctx.isLoaded, isSignedIn: ctx.isSignedIn, userId: ctx.user?.id ?? null, getToken: ctx.getToken };
}

export function useBridgeAuth() {
  const ctx = useContext(AuthContext);
  return { signIn: ctx.signIn, signUp: ctx.signUp, signOut: ctx.signOut, isSignedIn: ctx.isSignedIn, user: ctx.user };
}
