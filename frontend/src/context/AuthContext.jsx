import React, { createContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createApi } from '../utils/api'; // Importamos nuestra nueva función
import MiToast from '../components/common/Toast/MiToast';
import { toast } from "react-toastify";
export const AuthContext = createContext();

// Función para decodificar el JWT y verificar expiración
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return true;
    // exp está en segundos, Date.now() en ms
    return Date.now() >= payload.exp * 1000;
  } catch (e) {
    return true;
  }
}

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [habilitado, setHabilitado] = useState(false);
  const [user, setUser] = useState(null);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedIsAdmin = localStorage.getItem('isAdmin');
    const storedHabilitado = localStorage.getItem('habilitado');
    const storedUser = localStorage.getItem('user');

    if (token) {
      setIsAuthenticated(true);
      setIsAdmin(storedIsAdmin === 'true');
      setHabilitado(storedHabilitado === 'true');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } else {
      setIsAuthenticated(false);
      setIsAdmin(false);
      setHabilitado(false);
      setUser(null);
    }
  }, []);

  // Chequea el token cada vez que cambia la ruta
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && isTokenExpired(token)) {
      logout();
      navigate('/login', { replace: true });
    }
  }, [location.pathname]); // Se ejecuta en cada cambio de ruta

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('habilitado');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setHabilitado(false);
    setUser(null);
  };

  // Modifica handleUnauthorized para guardar la URL actual
  const handleUnauthorized = () => {
    setRedirectAfterLogin(window.location.pathname + window.location.search);
    logout();
    toast(<MiToast mensaje="Tu sesión ha expirado. Por favor, inicia sesión de nuevo." tipo="warning" />);
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 2000);
  };

  // Creamos una instancia de nuestro fetch wrapper y la pasamos al contexto
  const apiFetch = createApi(handleUnauthorized);

  const login = (token, isAdminUser, habilitadoUser, userData) => {
    localStorage.setItem('accessToken', token); // Guarda el token
    localStorage.setItem('isAdmin', isAdminUser);
    localStorage.setItem('habilitado', habilitadoUser);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData)); // Guarda los datos del usuario
      setUser(userData);
    }
    setIsAuthenticated(true);
    setIsAdmin(isAdminUser);
    setHabilitado(habilitadoUser);
  };

  const loginWithToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      localStorage.setItem('accessToken', token);
      setIsAuthenticated(true);
      setIsAdmin(payload.is_admin || false);
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
      apiFetch, isAuthenticated, isAdmin, habilitado, user, login, logout, loginWithToken,
      redirectAfterLogin, setRedirectAfterLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
};