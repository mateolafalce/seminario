import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [habilitado, setHabilitado] = useState(false);

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

  // Guarda los datos de sesión en localStorage y en el estado
  const login = (token, isAdminUser, habilitadoUser) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('isAdmin', isAdminUser);
    localStorage.setItem('habilitado', habilitadoUser);
    setIsAuthenticated(true);
    setIsAdmin(isAdminUser);
    setHabilitado(habilitadoUser);
  };

  // Solo guarda el token y setea autenticado
  const loginWithToken = (token) => {
    localStorage.setItem('accessToken', token)
    setIsAuthenticated(true)
  }

  // Limpia todo al cerrar sesión
  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('habilitado');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setHabilitado(false);
  };

  return (
    <AuthContext.Provider value={{ loginWithToken, isAuthenticated, isAdmin, habilitado, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};