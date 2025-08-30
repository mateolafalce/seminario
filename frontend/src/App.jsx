import './index.css';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useContext } from 'react';
import Login from './pages/Login';
import { ToastContainer, toast, cssTransition } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Register from './pages/Register';
import Navbar from './components/common/Navbar/Navbar';
import Reserva from './pages/Reserva';
import HomePage from './pages/HomePage';
import BuscarCliente from './pages/BuscarCliente';
import Admin from './pages/Admin';
import AdminDashboard from './pages/AdminDashboard';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Unauthorized from './pages/Unauthorized';
import Preferencias from './pages/Preferencia';
import MisReservas from './pages/MisReservas';
import AdminRoute from './components/admin/AdminRoute';
import Habilitado from './pages/Habilitado';
import MisDatos from './pages/MisDatos';
import CargarResultados from './pages/CargarResultados';
import Reseñas from './pages/Reseñas'; 
import Jugadores from './pages/Jugadores'; // <-- Importa el componente

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppWithTimeout />
      </AuthProvider>
    </Router>
  );
}

function AppWithTimeout() {
  const [showTimeoutOverlay, setShowTimeoutOverlay] = useState(false);
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useContext(AuthContext);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const inactivityTimeout = 60 * 60 * 1000;

  const resetInactivityTimer = () => setLastActivity(Date.now());

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetInactivityTimer));
    return () => events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
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
            navigate('/home');
          }, 3000);
        }
      }, 1000);
    } else {
      clearTimeout(timeoutId);
      setShowTimeoutOverlay(false);
    }
    return () => clearTimeout(timeoutId);
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
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reserva" element={<Reserva />} />
          <Route path="/clientes/buscar" element={<BuscarCliente />} />
          <Route path="/preferencias" element={<Preferencias />} />
          <Route path="/mis-reservas" element={<MisReservas />} />
          <Route path="/Admin/*" element={<AdminRoute />}>
            <Route index element={<Admin />} />
          </Route>
          <Route path="/habilitado" element={<Habilitado />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/mis-datos" element={<MisDatos />} />
          <Route path="/cargar-resultados" element={<CargarResultados />} /> 
          <Route path="/reseñas" element={<Reseñas />} /> 
          <Route path="/jugadores" element={<Jugadores />} /> 
        </Routes>
      </div>
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        draggable
        pauseOnHover
        toastClassName="mi-toast"
        style={{ top: "60px" }} // aparece debajo del header
      />
    </>
  );
}

export default App;