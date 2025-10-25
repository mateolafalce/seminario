// frontend/src/context/AuthContext.jsx
import React, { createContext, useEffect, useState, useCallback, useContext } from 'react';
import backendClient from '../services/backendClient';

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Leer cookie CSRF (no-HttpOnly). La de acceso es HttpOnly ⇢ no se puede leer en front.
const getCookie = (name) => {
  const n = `${name}=`;
  return document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(n))
    ?.slice(n.length) || '';
};
const hasSession = () => !!getCookie('csrf_token');

// Utilidades para snapshot de sesión (solo datos no sensibles)
const SNAP_KEY = 'meSnapshot'; // solo datos no sensibles

const readMeSnapshot = () => {
  try { return JSON.parse(sessionStorage.getItem(SNAP_KEY) || 'null'); }
  catch { return null; }
};
const writeMeSnapshot = (me) => {
  try {
    const snap = {
      id: me?.id,
      username: me?.username,
      habilitado: !!me?.habilitado,
      roles: me?.roles || [],
      permissions: me?.permissions || [],
    };
    sessionStorage.setItem(SNAP_KEY, JSON.stringify(snap));
  } catch {}
};
const clearMeSnapshot = () => {
  try { sessionStorage.removeItem(SNAP_KEY); } catch {}
};

const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);

  const [habilitado, setHabilitado] = useState(false);
  const [user, setUser] = useState(null);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);

  // Helpers RBAC
  const hasRole = useCallback((...names) => {
    return names.some(n => roles?.includes(n));
  }, [roles]);

  const hasAnyRole = hasRole; // alias

  const hasPerm = useCallback((...reqPerms) => {
    if (permissions?.includes('*')) return true;

    return reqPerms.some((required) => {
      // match directo
      if (permissions?.includes(required)) return true;

      // si el usuario tiene 'prefix.*' y se pide 'prefix.sufijo'
      const okByUserWildcard = permissions?.some(up =>
        up.endsWith('.*') && required.startsWith(up.slice(0, -1)) // 'reservas.*' -> 'reservas.'
      );
      if (okByUserWildcard) return true;

      // si se pide 'prefix.*' y el usuario tiene algún 'prefix.algo'
      if (required.endsWith('.*')) {
        const prefixDot = required.slice(0, -1); // queda 'reservas.' 
        return permissions?.some(up => up === required || up.startsWith(prefixDot));
      }

      return false;
    });
  }, [permissions]);

  // Carga inicial: si no hay csrf_token no consultamos /me
  useEffect(() => {
    let mounted = true;

    // 1) Hidratación instantánea desde snapshot
    const snap = hasSession() ? readMeSnapshot() : null;
    if (snap) {
      setIsAuthenticated(true);
      setUser(prev => prev || { id: snap.id, username: snap.username }); // opcional
      setHabilitado(!!snap.habilitado);
      setRoles(snap.roles || []);
      setPermissions(snap.permissions || []);
      // seguimos con loading=true para validar con /me
    }

    // 2) Validación real con /me si hay sesión
    (async () => {
      if (!hasSession()) {
        if (mounted) {
          setIsAuthenticated(false);
          setUser(null);
          setRoles([]); setPermissions([]);
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
        setHabilitado(!!me?.habilitado);
        setRoles(me?.roles || []);
        setPermissions(me?.permissions || []);
        writeMeSnapshot(me);
      } catch {
        if (!mounted) return;
        setIsAuthenticated(false);
        setUser(null);
        setRoles([]); setPermissions([]);
        setHabilitado(false);
        clearMeSnapshot();
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
    setRoles(data?.roles || []);
    setPermissions(data?.permissions || []);
    setHabilitado(!!data?.habilitado);
    setIsAuthenticated(true);

    // mini retry por la aplicación de cookies
    let me;
    try {
      me = await backendClient.get('users_b/me');
    } catch {
      await new Promise(r => setTimeout(r, 75));
      me = await backendClient.get('users_b/me');
    }
    setUser(me);
    writeMeSnapshot(me); // 👈 agrega esto
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await backendClient.post('users_b/logout'); } catch {}
    setIsAuthenticated(false);
    setUser(null);
    setRoles([]);
    setPermissions([]);
    setHabilitado(false);
    clearMeSnapshot(); // 👈 agrega esto
  }, []);

  return (
    <AuthContext.Provider value={{
      loading, isAuthenticated, user, habilitado,
      roles, permissions,
      hasRole, hasAnyRole, hasPerm,
      login, logout, redirectAfterLogin, setRedirectAfterLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
