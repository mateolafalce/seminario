import React, { createContext, useState, useEffect } from 'react';
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
  } catch (e) {
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

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedIsAdmin = localStorage.getItem('isAdmin');
    const storedIsEmpleado = localStorage.getItem('isEmpleado'); // Nuevo
    const storedHabilitado = localStorage.getItem('habilitado');
    const storedUser = localStorage.getItem('user');

    if (token) {
      setIsAuthenticated(true);
      setIsAdmin(storedIsAdmin === 'true');
      setIsEmpleado(storedIsEmpleado === 'true' || storedIsEmpleado === true);
      setHabilitado(storedHabilitado === 'true');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } else {
      setIsAuthenticated(false);
      setIsAdmin(false);
      setIsEmpleado(false); 
      setHabilitado(false);
      setUser(null);
    }
    setAuthReady(true);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && isTokenExpired(token)) {
      logout();
      navigate('/login', { replace: true });
    }
  }, [location.pathname]);

  const logout = () => {
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
  };

  const handleUnauthorized = () => {
    setRedirectAfterLogin(window.location.pathname + window.location.search);
    logout();
    toast(<MiToast mensaje="Tu sesión ha expirado. Por favor, inicia sesión de nuevo." tipo="warning" />);
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 2000);
  };

  const apiFetch = createApi(handleUnauthorized);

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
      const userData = {
        id: payload.id
      };
      setUser(userData);
    } catch (e) {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{
      apiFetch, isAuthenticated, isAdmin, isEmpleado, habilitado, user, login, logout, loginWithToken,
      redirectAfterLogin, setRedirectAfterLogin, authReady
    }}>
      {children}
    </AuthContext.Provider>
  );
};