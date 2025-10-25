import React, { useContext, useMemo } from 'react';
import { Navigate, useLocation, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { HiUsers } from "react-icons/hi";
import { IoStatsChartSharp } from "react-icons/io5";
import { PiCourtBasketballFill } from "react-icons/pi";
import { MdAccessTime } from "react-icons/md"; // 👈 Add icon for Horarios
import { FiLogOut } from 'react-icons/fi';
import { canManageUsers, canManageCanchas, canManageReservas, canViewStatistics } from '../utils/permissions';

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
  const { isAuthenticated, loading, logout, roles, permissions } = useContext(AuthContext);
  const me = useMemo(() => ({ roles, permissions }), [roles, permissions]);

  const flags = useMemo(() => ({
    showUsuarios: canManageUsers(me),
    showCanchas:  canManageCanchas(me),
    showReservas: canManageReservas(me),
    showEstadisticas: canViewStatistics(me),
  }), [me]);

  if (!isAuthenticated || !canManageUsers(me)) return <Navigate to="/" replace />;

  const nothing = !flags.showUsuarios && !flags.showCanchas && !flags.showReservas && !flags.showEstadisticas;

  return (
    <div className="bg-gray-900 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6 sm:py-8">
        {/* Sidebar */}
        <aside className="bg-gray-800 border border-gray-700 rounded-2xl p-4 h-fit flex flex-col gap-4 shadow-md sticky top-4">
          <div className="hidden lg:block">
            <h1 className="text-lg font-bold text-white mb-1">Panel Admin</h1>
            <p className="text-gray-400 text-xs mb-4">Gestión del sistema</p>
            
            <nav className="flex flex-col gap-2">
              {flags.showUsuarios && <SidebarLink to="/panel-control/usuarios" icon={<HiUsers />} label="Usuarios" />}
              {flags.showReservas && <SidebarLink to="/panel-control/reservas" icon={<IoStatsChartSharp />} label="Reservas" />}
              {flags.showCanchas && <SidebarLink to="/panel-control/canchas" icon={<PiCourtBasketballFill />} label="Canchas" />}
              {flags.showCanchas && <SidebarLink to="/panel-control/horarios" icon={<MdAccessTime />} label="Horarios" />}
              
              {nothing && (
                <div className="text-xs text-gray-400 px-3 py-2">
                  No tenés permisos para ver secciones del panel.
                </div>
              )}
              
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

          {/* Select mobile */}
          <div className="block lg:hidden">
            <label className="text-white text-sm font-medium mb-2">Secciones</label>
            <select
              value={location.pathname.split('/')[2] || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value) navigate(`/panel-control/${value}`);
              }}
              className="w-full bg-gray-700 text-white text-base p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">(Seleccioná)</option>
              {flags.showUsuarios && <option value="usuarios">Usuarios</option>}
              {flags.showReservas && <option value="reservas">Reservas</option>}
              {flags.showCanchas && <option value="canchas">Canchas</option>}
              {flags.showCanchas && <option value="horarios">Horarios</option>}
            </select>
          </div>
        </aside>

        {/* Main Content */}
        <main className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6 overflow-y-auto" style={{ maxHeight: '85vh' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Exportar componentes de tabs si los necesitás
export { default as TabUsuarios } from '../components/admin/dashboard/VerUsuariosInline';
export { default as TabCanchas } from '../components/admin/dashboard/VerCanchasInline';
export { default as TabReservas } from '../components/admin/dashboard/GestionReservas';
export { default as TabHorarios } from './TabHorarios';
