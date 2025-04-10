import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedIsAdmin = localStorage.getItem('isAdmin');

    if (token) {
      setIsAuthenticated(true);
      setIsAdmin(storedIsAdmin === 'true');
    } else {
      setIsAuthenticated(false);
      setIsAdmin(false);
    }
  }, []);

  const login = (token, isAdminUser) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('isAdmin', isAdminUser);
    setIsAuthenticated(true);
    setIsAdmin(isAdminUser);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('isAdmin');
    setIsAuthenticated(false);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};