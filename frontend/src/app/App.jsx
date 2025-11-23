import '../styles/index.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useContext, useMemo } from 'react';

import Login from '../features/auth/pages/Login';
import Register from '../features/auth/pages/Register';
import Navbar from '../shared/components/layout/Navbar/Navbar';
import Reserva from '../features/reservas/pages/Reserva';
import HomePage from '../features/home/pages/HomePage';
import BuscarCliente from '../features/usuarios/pages/BuscarCliente';
import Unauthorized from '../features/auth/pages/Unauthorized';
import Preferencias from '../features/preferencias/pages/Preferencia';
import MisReservas from '../features/reservas/pages/MisReservas';
import Habilitado from '../features/admin/pages/Habilitado';
import MisDatos from '../features/usuarios/pages/MisDatos';
import CargarResultados from '../features/reservas/pages/CargarResultados';
import ReseniasPublicas from '../features/resenias/pages/ReseniasPublicas';
import TabAlgoritmo from '../features/admin/pages/TabAlgoritmo';
import DetalleCancha from '../features/canchas/pages/DetalleCancha';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AuthProvider, { AuthContext } from '../features/auth/context/AuthContext';


// Permisos (modelo nuevo basado en roles/permissions)
import {
  canManageUsers,
  canManageCanchas,
  canManageReservas,
  canManageHorarios,
  canManageCategorias,
  canViewStatistics,
  canUseAlgoritmo,
} from '../shared/utils/permissions';

// PanelControl y tabs hijas
import PanelControl, { TabUsuarios, TabCanchas, TabReservas, TabHorarios, TabCategorias } from '../features/admin/pages/PanelControl';

// ---------- Layout que esconde Navbar en /panel-control ----------
function MainLayout({ children }) {
  const location = useLocation();
  const hideNavbar = location.pathname.startsWith('/panel-control'); // ocultar navbar en el panel

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
  const { loading, isAuthenticated, roles, permissions } = useContext(AuthContext);
  const me = useMemo(() => ({ roles, permissions }), [roles, permissions]);

  if (loading) return <div className="p-6 text-gray-200">Cargando…</div>;
  if (!isAuthenticated || !check(me)) {
    return <Navigate to="/panel-control" replace />;
  }
  return children;
}

// ---------- Auto redirige a la primera pestaña permitida ----------
function AutoRedirectPanel() {
  const { loading, isAuthenticated, roles, permissions } = useContext(AuthContext);
  const me = useMemo(() => ({ roles, permissions }), [roles, permissions]);

  if (loading) return <div className="p-6 text-gray-200">Cargando…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Orden sugerido: usuarios → canchas → horarios → reservas → estadísticas
  if (canManageUsers(me))     return <Navigate to="/panel-control/usuarios" replace />;
  if (canManageCanchas(me))   return <Navigate to="/panel-control/canchas" replace />;
  if (canManageCanchas(me))   return <Navigate to="/panel-control/horarios" replace />; // 👈 NUEVO
  if (canManageReservas(me))  return <Navigate to="/panel-control/reservas" replace />;
  if (canViewStatistics(me))  return <Navigate to="/panel-control/estadisticas" replace />;

  return <Navigate to="/" replace />;
}

// ---------- App con timeout de inactividad (tu lógica original) ----------
function AppWithTimeout() {
  const [showTimeoutOverlay, setShowTimeoutOverlay] = useState(false);
  const { logout, isAuthenticated } = useContext(AuthContext);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const inactivityTimeout = 60 * 60 * 1000; // 60 min

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

        <Route
          path="/canchas/:id"
          element={
            <PermissionRoute check={() => true}>
              <DetalleCancha />
            </PermissionRoute>
          }
        />

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
            path="horarios"
            element={
              <PermissionRoute check={canManageHorarios}>
                <TabHorarios />
              </PermissionRoute>
            }
          />

          <Route
            path="categorias"
            element={
              <PermissionRoute check={canManageCategorias}>
                <TabCategorias />
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

          <Route
            path="algoritmo"
            element={
              <PermissionRoute check={canUseAlgoritmo}>
                <TabAlgoritmo />
              </PermissionRoute>
            }
          />
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
