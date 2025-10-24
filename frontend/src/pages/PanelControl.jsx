import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { HiUsers } from "react-icons/hi";
import { IoStatsChartSharp } from "react-icons/io5";
import { PiCourtBasketballFill } from "react-icons/pi";
import { FiLogOut } from 'react-icons/fi';

import GestionUsuarios from '../components/admin/dashboard/VerUsuariosInline';
import ListarCanchas from '../components/admin/dashboard/VerCanchasInline';
import GestionReservas from '../components/admin/dashboard/GestionReservas';

import RegisterInline from '../components/admin/dashboard/RegisterInline';
import CrearCanchaInline from '../components/admin/dashboard/CrearCanchaInline';

import Modal from '../components/common/Modal/Modal';
import Button from '../components/common/Button/Button';

function SidebarLink({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-yellow-500/10 text-yellow-300'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white',
        ].join(' ')
      }
    >
      <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function PanelControl() {
  const { isAuthenticated, isAdmin, tipoAdmin, loading, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [refreshCanchas, setRefreshCanchas] = useState(false);

  const active = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    return parts[1] || '';
  }, [location.pathname]);

  const tabs = useMemo(() => ([
    { id: 'usuarios', label: 'Gestión Usuarios', icon: <HiUsers /> },
    { id: 'reservas', label: 'Gestión Reservas', icon: <IoStatsChartSharp /> },
    { id: 'canchas',  label: 'Gestión Canchas',  icon: <PiCourtBasketballFill /> },
  ]), []);

  useEffect(() => { setModalCrearAbierto(false); }, [active]);

  const handleUsuarioCreado = () => { setModalCrearAbierto(false); window.location.reload(); };
  const handleCanchaCreada  = () => { setModalCrearAbierto(false); setRefreshCanchas(r => !r); };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center text-gray-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
          <p className="mt-2">Verificando permisos…</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!isAdmin)         return <Navigate to="/" replace />;

  return (
    <div className="bg-gray-900 px-2 sm:px-4 lg:px-6 py-6 sm:py-8 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className="bg-gray-800 border border-gray-700 rounded-2xl p-4 h-fit flex flex-col gap-4 shadow-md sm:sticky top-4 z-10">
          {/* Select mobile */}
          <div className="block lg:hidden">
            <label className="text-white text-sm font-medium mb-2">Secciones</label>
            <select
              value={active || ''}
              onChange={(e) => {
                const value = e.target.value;
                navigate(value ? `/panel-control/${value}` : '/panel-control');
              }}
              className="w-full bg-gray-700 text-white text-base p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
            >
              <option value="">(Seleccioná)</option>
              {tabs.map(tab => (
                <option key={tab.id} value={tab.id}>{tab.label}</option>
              ))}
            </select>
          </div>

          {/* Links desktop */}
          <div className="hidden lg:block">
            <h1 className="text-lg font-bold text-white mb-1">Panel Admin</h1>
            <p className="text-gray-400 text-xs mb-4">Gestión del sistema</p>
            <nav className="flex flex-col gap-2">
              <SidebarLink to="/panel-control/usuarios" icon={<HiUsers />} label="Usuarios" />
              <SidebarLink to="/panel-control/reservas" icon={<IoStatsChartSharp />} label="Reservas" />
              <SidebarLink to="/panel-control/canchas"  icon={<PiCourtBasketballFill />} label="Canchas" />
              <div className="my-2 h-px bg-gray-700" />
              <button
                onClick={logout}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/10 hover:text-white transition-colors"
              >
                <FiLogOut className="w-5 h-5" />
                Cerrar sesión
              </button>
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 sm:px-6 py-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4 min-w-0">
              <span className="text-3xl sm:text-5xl text-white">
                {tabs.find(t => t.id === active)?.icon}
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white truncate">
                  {tabs.find(t => t.id === active)?.label || 'Panel'}
                </h2>
                <p className="text-gray-400 text-xs mt-1">
                  {active === 'usuarios' && 'Administra todos los usuarios del sistema'}
                  {active === 'canchas'  && 'Administra todas las canchas del sistema'}
                  {active === 'reservas' && 'Gestiona las reservas del sistema'}
                  {!active && 'Seleccioná una sección para comenzar'}
                </p>
              </div>
            </div>

            {active === 'usuarios' && (
              <Button
                texto="Crear Usuario"
                onClick={() => setModalCrearAbierto(true)}
                variant="primary"
                size="md"
                className="rounded-lg font-semibold shadow w-full sm:w-auto"
                icon={<span className="text-base">+</span>}
              />
            )}
            {active === 'canchas' && (
              <Button
                texto="Crear Cancha"
                onClick={() => setModalCrearAbierto(true)}
                variant="primary"
                size="md"
                className="rounded-lg font-semibold shadow w-full sm:w-auto"
                icon={<span className="text-base">+</span>}
              />
            )}
          </div>

          <div
            className="overflow-y-auto overflow-x-hidden bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-6xl mx-auto min-w-0"
            style={{ maxHeight: '75vh' }}
          >
            {/* Opcional helpers invisibles */}
            {location.pathname.startsWith('/panel-control/usuarios') && (
              <div className="hidden"><GestionUsuarios /></div>
            )}
            {location.pathname.startsWith('/panel-control/canchas') && (
              <div className="hidden"><ListarCanchas key={String(refreshCanchas)} /></div>
            )}
            {location.pathname.startsWith('/panel-control/reservas') && (
              <div className="hidden"><GestionReservas /></div>
            )}
            {/* Contenido real por rutas hijas */}
            <div className="p-4 sm:p-6 min-w-0">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Modal */}
      <Modal isOpen={modalCrearAbierto} onClose={() => setModalCrearAbierto(false)}>
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
          <h5 className="text-xl font-bold text-white">
            {active === 'usuarios' ? 'Crear Nuevo Usuario' : 'Crear Nueva Cancha'}
          </h5>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-200 text-3xl font-bold"
            onClick={() => setModalCrearAbierto(false)}
          >
            ×
          </button>
        </div>
        <div className="px-6 py-6">
          {active === 'usuarios' && <RegisterInline onUsuarioCreado={handleUsuarioCreado} />}
          {active === 'canchas'  && <CrearCanchaInline onCanchaCreada={handleCanchaCreada} />}
        </div>
      </Modal>
    </div>
  );
}

export function TabUsuarios()  { return <GestionUsuarios />; }
export function TabCanchas()   { return <ListarCanchas />; }
export function TabReservas()  { return <GestionReservas />; }
