// ============================================================
//  AuthContext - shares "who is logged in" with the whole app.
//
//  Any component can do:
//     const { user, login, logout } = useAuth();
// ============================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { tokenStorage } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => tokenStorage.get());
  // While true, we're still checking a saved token -> don't redirect to /login yet.
  const [loading, setLoading] = useState(() => Boolean(tokenStorage.get()));

  // Save the token + user after a successful login/register.
  const saveSession = useCallback((data) => {
    tokenStorage.set(data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password });
      saveSession(data);
    },
    [saveSession]
  );

  const register = useCallback(
    async (username, email, password) => {
      const { data } = await api.post('/auth/register', { username, email, password });
      saveSession(data);
    },
    [saveSession]
  );

  // Re-download the user (e.g. to show the new Elo after a match).
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (err) {
      // 401 = token expired/invalid -> log out. Other errors: keep the session.
      if (err.response?.status === 401) logout();
    }
  }, [logout]);

  // On first page load: if a token was saved, check it's still valid.
  useEffect(() => {
    if (!tokenStorage.get()) return;
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  // useMemo -> components only re-render when one of these values changes.
  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, refreshUser }),
    [user, token, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
