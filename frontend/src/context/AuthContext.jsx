import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createApi } from '../utils/api';
import MiToast from '../components/common/Toast/MiToast';
import { toast } from "react-toastify";

export const AuthContext = createContext();

function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return true;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmpleado, setIsEmpleado] = useState(false);
  const [habilitado, setHabilitado] = useState(false);
  const [user, setUser] = useState(null);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // locks para no spamear toasts/logouts en ráfaga
  const unauthorizedLockRef = useRef(false);
  const last401Ref = useRef(0);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedIsAdmin = localStorage.getItem('isAdmin');
    const storedIsEmpleado = localStorage.getItem('isEmpleado');
    const storedHabilitado = localStorage.getItem('habilitado');
    const storedUser = localStorage.getItem('user');

    if (token) {
      setIsAuthenticated(true);
      setIsAdmin(storedIsAdmin === 'true');
      setIsEmpleado(storedIsEmpleado === 'true' || storedIsEmpleado === true);
      setHabilitado(storedHabilitado === 'true');
      if (storedUser) setUser(JSON.parse(storedUser));
    } else {
      setIsAuthenticated(false);
      setIsAdmin(false);
      setIsEmpleado(false);
      setHabilitado(false);
      setUser(null);
    }
    setAuthReady(true);
  }, []);

  // Si el token expira, cerramos sesión y redirigimos a login
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && isTokenExpired(token)) {
      logout();
      navigate('/login', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isEmpleado');
    localStorage.removeItem('habilitado');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsEmpleado(false);
    setHabilitado(false);
    setUser(null);
  }, []);

  // 👉 se invoca desde apiFetch en 401
  const handleUnauthorized = useCallback(() => {
    const now = Date.now();
    // Evitar múltiples ejecuciones simultáneas
    if (unauthorizedLockRef.current || now - last401Ref.current < 2000) return;
    unauthorizedLockRef.current = true;
    last401Ref.current = now;

    // guardamos a dónde volver
    setRedirectAfterLogin(window.location.pathname + window.location.search);

    // Evitar toast si ya estamos en /login
    if (location.pathname !== '/login') {
      toast(<MiToast mensaje="Tu sesión ha expirado. Por favor, inicia sesión de nuevo." tipo="warning" />, {
        toastId: 'session-expired', // evita duplicados
      });
    }

    logout();
    setTimeout(() => {
      navigate('/login', { replace: true });
      // liberamos el lock
      setTimeout(() => { unauthorizedLockRef.current = false; }, 500);
    }, 200); // redirige rápido para que los componentes desmonten y no sigan pidiendo
  }, [location.pathname, logout, navigate]);

  const apiFetch = createApi(handleUnauthorized); // ver utils/api abajo

  const login = (token, isAdminUser, isEmpleadoUser, habilitadoUser, userData) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('isAdmin', isAdminUser);
    localStorage.setItem('isEmpleado', isEmpleadoUser);
    localStorage.setItem('habilitado', habilitadoUser);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    }
    setIsAuthenticated(true);
    setIsAdmin(isAdminUser);
    setIsEmpleado(isEmpleadoUser);
    setHabilitado(habilitadoUser);
  };

  const loginWithToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      localStorage.setItem('accessToken', token);
      setIsAuthenticated(true);
      setIsAdmin(payload.is_admin || false);
      setIsEmpleado(payload.is_empleado || false);
      setHabilitado(payload.habilitado || false);
      setUser({ id: payload.id });
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{
      apiFetch, isAuthenticated, isAdmin, isEmpleado, habilitado, user,
      login, logout, loginWithToken, redirectAfterLogin, setRedirectAfterLogin, authReady
    }}>
      {children}
    </AuthContext.Provider>
  );
};