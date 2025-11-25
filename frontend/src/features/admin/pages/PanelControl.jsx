import { useContext, useMemo, useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../auth/context/AuthContext';

// Iconos
import { HiUsers, HiMenu, HiX } from "react-icons/hi";
import { IoStatsChartSharp } from "react-icons/io5";
import { PiCourtBasketballFill } from "react-icons/pi";
import { FiLogOut } from 'react-icons/fi';
import { FaProjectDiagram } from "react-icons/fa";

import {
  canManageUsers,
  canManageCanchas,
  canManageReservas,
  canViewStatistics,
  canUseAlgoritmo,
} from '../../../shared/utils/permissions';

function SidebarLink({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
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
  const { loading, isAuthenticated, roles, permissions } = useContext(AuthContext);
  const me = useMemo(() => ({ roles, permissions }), [roles, permissions]);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const flags = useMemo(() => ({
    showUsuarios:     canManageUsers(me),
    showCanchas:      canManageCanchas(me),
    showReservas:     canManageReservas(me),
    showEstadisticas: canViewStatistics(me),
    showAlgoritmo:    canUseAlgoritmo(me),
  }), [me]);

  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Cargando panel...</div>
      </div>
    );
  }

  if (!isAuthenticated || !canManageReservas(me)) return <Navigate to="/" replace />;

  const nothing = !flags.showUsuarios && !flags.showCanchas && !flags.showReservas && !flags.showEstadisticas && !flags.showAlgoritmo;

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col lg:flex-row">
      <div className="lg:hidden bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <h1 className="text-lg font-bold text-white tracking-wide">Panel Admin</h1>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-gray-300 hover:text-white focus:outline-none p-2 rounded-lg hover:bg-gray-700"
        >
          {mobileMenuOpen ? <HiX size={24} /> : <HiMenu size={24} />}
        </button>
      </div>

      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:h-screen lg:overflow-y-auto
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6">
          <div className="mb-6 px-2">
            <h1 className="text-lg font-bold text-white">Administración</h1>
            <p className="text-gray-400 text-xs mt-1">Gestión del sistema</p>
          </div>

          <nav className="flex flex-col gap-2">
            {flags.showUsuarios   && <SidebarLink onClick={() => setMobileMenuOpen(false)} to="/panel-control/usuarios"   icon={<HiUsers />}                label="Usuarios" />}
            {flags.showReservas   && <SidebarLink onClick={() => setMobileMenuOpen(false)} to="/panel-control/reservas"   icon={<IoStatsChartSharp />}      label="Reservas" />}
            {flags.showCanchas    && <SidebarLink onClick={() => setMobileMenuOpen(false)} to="/panel-control/canchas"    icon={<PiCourtBasketballFill />}  label="Canchas" />}
            {flags.showAlgoritmo  && <SidebarLink onClick={() => setMobileMenuOpen(false)} to="/panel-control/algoritmo"  icon={<FaProjectDiagram size={18} />} label="Algoritmo" />}

            {nothing && <div className="text-xs text-gray-500 px-4 py-4 text-center border border-gray-700 rounded-lg border-dashed">Sin permisos visibles</div>}

            <div className="my-2 h-px bg-gray-700" />

            <button
              onClick={() => navigate('/home')}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-yellow-300 hover:bg-yellow-500/10 hover:text-white transition-colors"
            >
              <FiLogOut className="w-5 h-5" />
              <span>Volver</span>
            </button>
          </nav>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="flex-1 p-6 overflow-y-auto h-[calc(100vh-60px)] lg:h-screen bg-gray-900">
         <Outlet />
      </main>
    </div>
  );
}

// CORRECCIÓN FINAL: Exportar correctamente. TabAlgoritmo está en la misma carpeta 'pages'.
export { default as TabUsuarios }   from '../components/dashboard/GestionUsuarios';
export { default as TabCanchas }    from '../components/dashboard/GestionCanchas';
export { default as TabReservas }   from '../components/dashboard/GestionReservas';
export { default as TabAlgoritmo }  from './TabAlgoritmo'; // <-- Ruta corregida (está junto a PanelControl.jsx)