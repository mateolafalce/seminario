import './index.css';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Navbar from './components/Navbar';
import Reserva from './pages/Reserva';
import HomePage from './pages/HomePage';
import Admin from './pages/Admin';
import { AuthProvider, AuthContext } from './components/AuthContext';
import Unauthorized from './pages/Unauthorized';
import AdminRoute from './components/AdminRoute';
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

  // Los comentarios estos me distraen
  // si son para algo descomentenlos.
  useEffect(() => {
    //console.log("useEffect para event listeners activado");
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
      //console.log(`EventListener agregado para ${event}`);
    });

    return () => {
      //console.log("Limpiando event listeners");
      events.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
        //console.log(`EventListener removido para ${event}`);
      });
    };
  }, []);

  useEffect(() => {
    //console.log("useEffect para timeout activado", isAuthenticated, lastActivity);
    let timeoutId;

    if (isAuthenticated) {
      timeoutId = setTimeout(() => {
        const now = Date.now();
        const inactiveTime = now - lastActivity;
        //console.log("Verificando inactividad:", inactiveTime);
        if (inactiveTime > inactivityTimeout) {
          //console.log("Inactividad detectada, mostrando overlay");
          setShowTimeoutOverlay(true);
          setTimeout(() => {
            //console.log("Redirigiendo y cerrando sesión");
            logout();
            navigate('/HomePage');
          }, 3000);
        }
      }, 1000); 
    } else {
      //console.log("Usuario no autenticado, limpiando timeout");
      clearTimeout(timeoutId);
      setShowTimeoutOverlay(false);
    }

    return () => {
      //console.log("Limpiando timeout");
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, lastActivity, navigate, logout, inactivityTimeout]);

  //console.log("Renderizando AppWithTimeout", { showTimeoutOverlay, isAuthenticated });

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
          <Route path="/HomePage" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reserva" element={<Reserva />} />
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