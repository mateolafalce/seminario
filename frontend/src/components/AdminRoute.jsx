// components/AdminRoute.jsx
import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './AuthContext';

const AdminRoute = () => {
  const { isAuthenticated, isAdmin } = useContext(AuthContext);

  if (!isAuthenticated) {
    return <Navigate to="/Login" />;
  }

  if (!isAdmin) {
    return <Navigate to="/Unauthorized" />;
  }

  return <Outlet />;
};

export default AdminRoute;