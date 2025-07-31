import React, { createContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createApi } from '../utils/api'; // Importamos nuestra nueva función

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
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedIsAdmin = localStorage.getItem('isAdmin');
    const storedHabilitado = localStorage.getItem('habilitado');

    if (token) {
      setIsAuthenticated(true);
      setIsAdmin(storedIsAdmin === 'true');
      setHabilitado(storedHabilitado === 'true');
    } else {
      setIsAuthenticated(false);
      setIsAdmin(false);
      setHabilitado(false);
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
    setIsAuthenticated(false);
    setIsAdmin(false);
    setHabilitado(false);
  };

  // --- NUEVA LÓGICA ---
  // Función que se ejecutará cuando la API devuelva un 401
  const handleUnauthorized = () => {
    logout();
    alert("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
    navigate('/login', { replace: true });
  };

  // Creamos una instancia de nuestro fetch wrapper y la pasamos al contexto
  const apiFetch = createApi(handleUnauthorized);
  // --- FIN NUEVA LÓGICA ---

  const login = (token, isAdminUser, habilitadoUser) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('isAdmin', isAdminUser);
    localStorage.setItem('habilitado', habilitadoUser);
    setIsAuthenticated(true);
    setIsAdmin(isAdminUser);
    setHabilitado(habilitadoUser);
  };

  const loginWithToken = (token) => {
    localStorage.setItem('accessToken', token)
    setIsAuthenticated(true)
  }

  return (
    <AuthContext.Provider value={{ apiFetch, isAuthenticated, isAdmin, habilitado, login, logout, loginWithToken }}>
      {children}
    </AuthContext.Provider>
  );
};