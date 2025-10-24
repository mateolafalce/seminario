import './index.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect, useContext } from 'react';

import Login from './pages/Login';
import Register from './pages/Register';
import Navbar from './components/common/Navbar/Navbar';
import Reserva from './pages/Reserva';
import HomePage from './pages/HomePage';
import BuscarCliente from './pages/BuscarCliente';
import Unauthorized from './pages/Unauthorized';
import Preferencias from './pages/Preferencia';
import MisReservas from './pages/MisReservas';
import Habilitado from './pages/Habilitado';
import MisDatos from './pages/MisDatos';
import CargarResultados from './pages/CargarResultados';
import ReseniasPublicas from './pages/ReseniasPublicas';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AuthProvider, { AuthContext } from './context/AuthContext';

// Nuevo: permisos
import {
  canManageUsers,
  canManageCanchas,
  canManageReservas,
  canViewStatistics
} from './utils/permissions';

// PanelControl y tabs hijas
import PanelControl, { TabUsuarios, TabCanchas, TabReservas } from './pages/PanelControl';

// ---------- Layout que esconde Navbar en /panel-control ----------
function MainLayout({ children }) {
  const location = useLocation();

  // Oculta navbar cuando estás en el panel (cualquier tamaño, ajustá si querés solo desktop)
  const hideNavbar = location.pathname.startsWith('/panel-control');

  return (
    <>
      {!hideNavbar && <Navbar />}
      <div className="content">{children}</div>
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
        style={{ top: "60px" }}
      />
    </>
  );
}

// ---------- Protege pestañas específicas del panel ----------
function PermissionRoute({ check, children }) {
  const { loading, isAdmin, tipoAdmin } = useContext(AuthContext);

  if (loading) return <div className="p-6 text-gray-200">Cargando…</div>;
  if (!isAdmin || !check(isAdmin, tipoAdmin)) {
    // sin permiso -> panel raíz
    return <Navigate to="/panel-control" replace />;
  }
  return children;
}

// ---------- Auto redirige a la primera pestaña permitida ----------
function AutoRedirectPanel() {
  const { loading, isAdmin, tipoAdmin } = useContext(AuthContext);
  if (loading) return <div className="p-6 text-gray-200">Cargando…</div>;

  if (canManageUsers(isAdmin, tipoAdmin))    return <Navigate to="/panel-control/usuarios" replace />;
  if (canManageCanchas(isAdmin, tipoAdmin))  return <Navigate to="/panel-control/canchas" replace />;
  if (canManageReservas(isAdmin, tipoAdmin)) return <Navigate to="/panel-control/reservas" replace />;
  if (canViewStatistics(isAdmin, tipoAdmin)) return <Navigate to="/panel-control/estadisticas" replace />;
  return <Navigate to="/" replace />;
}

// ---------- App con timeout de inactividad (tu lógica original) ----------
function AppWithTimeout() {
  const [showTimeoutOverlay, setShowTimeoutOverlay] = useState(false);
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
            window.location.assign('/home');
          }, 3000);
        }
      }, 1000);
    } else {
      clearTimeout(timeoutId);
      setShowTimeoutOverlay(false);
    }
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, lastActivity, logout, inactivityTimeout]);

  return (
    <>
      {showTimeoutOverlay && (
        <div className="session-timeout-overlay">
          <h2>Sesión Expirada</h2>
          <p>Serás redirigido a la página principal en 3 segundos...</p>
        </div>
      )}

      <Routes>
        {/* Públicas */}
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/reserva" element={<Reserva />} />
        <Route path="/clientes/buscar" element={<BuscarCliente />} />
        <Route path="/preferencias" element={<Preferencias />} />
        <Route path="/mis-reservas" element={<MisReservas />} />
        <Route path="/habilitado" element={<Habilitado />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/mis-datos" element={<MisDatos />} />
        <Route path="/cargar-resultados" element={<CargarResultados />} />
        <Route path="/resenias" element={<ReseniasPublicas />} />

        {/* Compat: vieja ruta -> nueva */}
        <Route path="/admin/dashboard" element={<Navigate to="/panel-control" replace />} />

        {/* Panel de Control con subrutas */}
        <Route path="/panel-control" element={<PanelControl />}>
          <Route index element={<AutoRedirectPanel />} />

          <Route
            path="usuarios"
            element={
              <PermissionRoute check={canManageUsers}>
                <TabUsuarios />
              </PermissionRoute>
            }
          />

          <Route
            path="canchas"
            element={
              <PermissionRoute check={canManageCanchas}>
                <TabCanchas />
              </PermissionRoute>
            }
          />

          <Route
            path="reservas"
            element={
              <PermissionRoute check={canManageReservas}>
                <TabReservas />
              </PermissionRoute>
            }
          />

          {/* Si agregás estadísticas: */}
          {/* <Route
            path="estadisticas"
            element={
              <PermissionRoute check={canViewStatistics}>
                <Estadisticas />
              </PermissionRoute>
            }
          /> */}
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <MainLayout>
          <AppWithTimeout />
        </MainLayout>
      </AuthProvider>
    </Router>
  );
}
