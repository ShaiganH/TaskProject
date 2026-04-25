import {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from 'react';
import { authApi } from '../api/AuthApi';
import { setAccessToken, clearAccessToken, getAccessToken } from '../api/AxiosInstance';
import { getProfile } from '../api/UserService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  // Expose the raw token so SignalR can use it for its own HTTP handshake
  const [token,   setToken]   = useState(null);

  const refreshCalledRef = useRef(false);

  useEffect(() => {
    if (refreshCalledRef.current) return;
    refreshCalledRef.current = true;

    const restoreSession = async () => {
      try {
        const data = await authApi.refresh();
        setAccessToken(data.accessToken);
        setToken(data.accessToken);        // ← expose token for SignalR
        setUser(data.user);
      } catch {
        clearAccessToken();
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    setAccessToken(data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const registerUser = useCallback(async (userData) => {
    const data = await authApi.register(userData);
    setAccessToken(data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { }
    finally { clearAccessToken(); setToken(null); setUser(null); }
  }, []);

  const logoutAllDevices = useCallback(async () => {
    try { await authApi.logoutAllDevices(); }
    finally { clearAccessToken(); setToken(null); setUser(null); }
  }, []);

  // Re-fetch the current user's profile from the server and merge into user state.
  // Called after bio/picture updates so the UI stays in sync without a full page reload.
  const refreshUser = useCallback(async () => {
    try {
      const res = await getProfile();
      // Merge — keep role/id from existing user, update profile fields from server
      setUser((prev) => prev ? { ...prev, ...res.data } : res.data);
    } catch {
      // silently ignore — not critical
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, token, isAuthenticated: !!user,
      login, registerUser, logout, logoutAllDevices, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
