import { useContext, useMemo, useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../auth/context/AuthContext';
import { HiUsers, HiMenu, HiX } from "react-icons/hi";
import { IoStatsChartSharp } from "react-icons/io5";
import { PiCourtBasketballFill } from "react-icons/pi";
import { FiLogOut } from 'react-icons/fi';
import { FaProjectDiagram } from "react-icons/fa";

import {
  canManageUsers, canManageCanchas, canManageReservas, canViewStatistics, canUseAlgoritmo,
} from '../../../shared/utils/permissions';

// SidebarLink mejorado con indicador visual activo (borde izquierdo)
function SidebarLink({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 rounded-r-lg border-l-[3px] px-4 py-3 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-yellow-500/10 border-yellow-400 text-yellow-400' // Activo: fondo sutil + borde amarillo
            : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200', // Inactivo
        ].join(' ')
      }
    >
      <span className="text-lg">{icon}</span>
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

  if (loading) return <div className="bg-slate-950 min-h-screen flex items-center justify-center text-slate-500">Cargando...</div>;
  if (!isAuthenticated || !canManageReservas(me)) return <Navigate to="/" replace />;

  const nothing = !flags.showUsuarios && !flags.showCanchas && !flags.showReservas && !flags.showEstadisticas && !flags.showAlgoritmo;

  return (
    // CAMBIO: bg-slate-950 para el fondo general (más oscuro)
    <div className="bg-slate-950 min-h-screen flex flex-col lg:flex-row font-sans">
      
      {/* Mobile Header */}
      <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <h1 className="text-lg font-bold text-white tracking-wide">Panel Admin</h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-300 p-2">
          {mobileMenuOpen ? <HiX size={24} /> : <HiMenu size={24} />}
        </button>
      </div>

      {/* Sidebar - CAMBIO: bg-slate-900 (un poco más claro que el fondo) y borde sutil */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:h-screen lg:overflow-y-auto
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6">
          <div className="mb-8 px-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Boulevard<span className="text-yellow-400">81</span></h1>
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider font-semibold">Administración</p>
          </div>

          <nav className="flex flex-col gap-1">
            {flags.showUsuarios   && <SidebarLink onClick={() => setMobileMenuOpen(false)} to="/panel-control/usuarios"   icon={<HiUsers />}                label="Usuarios" />}
            {flags.showReservas   && <SidebarLink onClick={() => setMobileMenuOpen(false)} to="/panel-control/reservas"   icon={<IoStatsChartSharp />}      label="Reservas" />}
            {flags.showCanchas    && <SidebarLink onClick={() => setMobileMenuOpen(false)} to="/panel-control/canchas"    icon={<PiCourtBasketballFill />}  label="Canchas" />}
            {flags.showAlgoritmo  && <SidebarLink onClick={() => setMobileMenuOpen(false)} to="/panel-control/algoritmo"  icon={<FaProjectDiagram size={18} />} label="Algoritmo" />}

            {nothing && <div className="text-xs text-slate-500 px-4 py-4 text-center border border-slate-800 rounded border-dashed">Sin permisos</div>}

            <div className="my-4 h-px bg-slate-800 mx-2" />

            <button
              onClick={() => navigate('/home')}
              className="group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors w-full text-left"
            >
              <FiLogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
              <span>Volver al Home</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Overlay Mobile */}
      {mobileMenuOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}

      {/* Main Content - CAMBIO: max-w-7xl para evitar que se estire demasiado en pantallas gigantes */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto h-[calc(100vh-60px)] lg:h-screen">
         <div className="max-w-7xl mx-auto">
            <Outlet />
         </div>
      </main>
    </div>
  );
}

export { default as TabUsuarios }   from '../components/dashboard/GestionUsuarios';
export { default as TabCanchas }    from '../components/dashboard/GestionCanchas';
export { default as TabReservas }   from '../components/dashboard/GestionReservas';
export { default as TabAlgoritmo }  from './TabAlgoritmo';