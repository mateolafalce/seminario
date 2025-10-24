import React, { createContext, useEffect, useState, useCallback } from 'react';
import backendClient from '../services/backendClient';

export const AuthContext = createContext();

const getCookie = (name) => {
  const n = `${name}=`;
  return document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(n))
    ?.slice(n.length) || '';
};
const hasSession = () => !!getCookie('csrf_token');

const STORAGE_KEYS = {
  IS_ADMIN: 'ui_isAdmin',
  IS_EMPLEADO: 'ui_isEmpleado',
};

const readBool = (k) => localStorage.getItem(k) === 'true';
const writeBool = (k, v) => localStorage.setItem(k, v ? 'true' : 'false');
const clearBool = (k) => localStorage.removeItem(k);

const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmpleado, setIsEmpleado] = useState(false);
  const [habilitado, setHabilitado] = useState(false);
  const [tipoAdmin] = useState(null);
  const [user, setUser] = useState(null);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);

  // Carga inicial de sesión (evitar 401 si no hay cookies)
  useEffect(() => {
    let mounted = true;
    (async () => {
      // Si no hay csrf_token, no hay sesión -> no llames /me
      if (!hasSession()) {
        if (mounted) {
          setIsAuthenticated(false);
          setUser(null);
          setIsAdmin(false);
          setIsEmpleado(false);
          setHabilitado(false);
          setLoading(false);
        }
        return;
      }
      try {
        const me = await backendClient.get('users_b/me');
        if (!mounted) return;
        setIsAuthenticated(true);
        setUser(me);
        setHabilitado(me?.habilitado ?? false);
        setIsAdmin(readBool(STORAGE_KEYS.IS_ADMIN));
        setIsEmpleado(readBool(STORAGE_KEYS.IS_EMPLEADO));
      } catch {
        if (!mounted) return;
        setIsAuthenticated(false);
        setUser(null);
        setIsAdmin(false);
        setIsEmpleado(false);
        setHabilitado(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const login = useCallback(async (username, password) => {
    const form = new URLSearchParams();
    form.append('username', username);
    form.append('password', password);

    const data = await backendClient.post('users_b/login', form);

    setIsAdmin(!!data.is_admin);
    setIsEmpleado(!!data.is_empleado);
    setHabilitado(!!data.habilitado);
    writeBool(STORAGE_KEYS.IS_ADMIN, !!data.is_admin);
    writeBool(STORAGE_KEYS.IS_EMPLEADO, !!data.is_empleado);

    // pequeño retry por si el navegador aplica Set-Cookie un tick después
    let me;
    try {
      me = await backendClient.get('users_b/me');
    } catch {
      await new Promise(r => setTimeout(r, 75));
      me = await backendClient.get('users_b/me');
    }

    setIsAuthenticated(true);
    setUser(me);

    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await backendClient.post('users_b/logout'); } catch {}
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsEmpleado(false);
    setHabilitado(false);
    setUser(null);
    clearBool(STORAGE_KEYS.IS_ADMIN);
    clearBool(STORAGE_KEYS.IS_EMPLEADO);
  }, []);

  return (
    <AuthContext.Provider value={{
      loading, isAuthenticated, isAdmin, isEmpleado, habilitado, tipoAdmin, user,
      login, logout, redirectAfterLogin, setRedirectAfterLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
