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
      setIsAdmin(storedHabilitado === 'true');
    } else {
      setIsAuthenticated(false);
      setIsAdmin(false);
      setHabilitado(false);
    }
  }, []);

  const login = (token, isAdminUser, habilitado) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('isAdmin', isAdminUser);
    localStorage.setItem('habilitado', habilitado);
    setIsAuthenticated(true);
    setIsAdmin(isAdminUser);
    setHabilitado(habilitado)
  };

  const loginWithToken = (token) => {
    localStorage.setItem('accessToken', token)
    setIsAuthenticated(true)
  }

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