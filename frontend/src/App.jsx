import './index.css';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Canchas from './pages/Canchas';
import Register from './pages/Register';
import Navbar from './components/common/Navbar/Navbar';
import Reserva from './pages/Reserva';
import HomePage from './pages/HomePage';
import GestionClientes from './pages/GestionClientes';
import BuscarCliente from './pages/BuscarCliente';
import Admin from './pages/Admin';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Unauthorized from './pages/Unauthorized';
import Preferencias from './pages/Preferencia';
import AdminRoute from './components/admin/AdminRoute';
import React, { useState, useEffect, useContext } from 'react';

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppWithTimeout />
      </Router>
    </AuthProvider>
  );
}

function AppWithTimeout() {
  const [showTimeoutOverlay, setShowTimeoutOverlay] = useState(false);
  const navigate = useNavigate(); 
  const { logout, isAuthenticated } = useContext(AuthContext);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const inactivityTimeout = 5 * 60 * 1000;

  const resetInactivityTimer = () => {
    setLastActivity(Date.now());
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, []);

  useEffect(() => {
    let timeoutId;

    if (isAuthenticated) {
      timeoutId = setTimeout(() => {
        const now = Date.now();
        const inactiveTime = now - lastActivity;
        if (inactiveTime > inactivityTimeout) {
          setShowTimeoutOverlay(true);
          setTimeout(() => {
            logout();
            navigate('/HomePage');
          }, 3000);
        }
      }, 1000); 
    } else {
      clearTimeout(timeoutId);
      setShowTimeoutOverlay(false);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, lastActivity, navigate, logout, inactivityTimeout]);

  return (
    <>
      <Navbar />
      <div className="content">
        {showTimeoutOverlay && (
          <div className="session-timeout-overlay">
            <h2>Sesión Expirada</h2>
            <p>Serás redirigido a la página principal en 3 segundos...</p>
          </div>
        )}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/canchas" element={<Canchas />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reserva" element={<Reserva />} />
          <Route path="/gestionar-clientes" element={<GestionClientes />} />
          <Route path="/clientes/buscar" element={<BuscarCliente />} />
          <Route path="/preferencias" element={<Preferencias />} />
          <Route path="/Admin/*" element={<AdminRoute />}>
          <Route index element={<Admin />} />
          </Route>
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Routes>
      </div>
    </>
  );
}

export default App;