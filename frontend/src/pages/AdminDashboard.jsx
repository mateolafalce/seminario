import React, { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import GestionUsuarios from '../components/admin/dashboard/VerUsuariosInline';
import RegisterInline from '../components/admin/dashboard/RegisterInline';
import ListarCanchas from '../components/admin/dashboard/VerCanchasInline';
import CrearCanchaInline from '../components/admin/dashboard/CrearCanchaInline';
import Modal from '../components/common/Modal/Modal';
import Button from '../components/common/Button/Button';
import { HiUsers } from "react-icons/hi";
import { IoStatsChartSharp } from "react-icons/io5";
import { PiCourtBasketballFill } from "react-icons/pi";
import GestionReservas from '../components/admin/dashboard/GestionReservas';

function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('usuarios');
    const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
    const [refreshCanchas, setRefreshCanchas] = useState(false); // NUEVO: para refrescar listado de canchas
    const { isAuthenticated, isAdmin, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    if (!isAuthenticated || !isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h2>
                    <p className="text-red-400">No tienes permisos para ver esta página.</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'usuarios', label: 'Gestión Usuarios', icon: <HiUsers />, shortLabel: 'Usuarios' },
        { id: 'reservas', label: 'Gestion Reservas', icon: <IoStatsChartSharp />, shortLabel: 'Reservas' },
        { id: 'canchas', label: 'Gestion Canchas', icon: <PiCourtBasketballFill />, shortLabel: 'Canchas' },
    ];

    const handleUsuarioCreado = () => {
        setModalCrearAbierto(false);
        window.location.reload();
    };

    const handleCanchaCreada = () => {
        setModalCrearAbierto(false);
        setRefreshCanchas(r => !r);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'usuarios':
                return <GestionUsuarios />;
            case 'canchas':
                return <ListarCanchas key={refreshCanchas} />;
            case 'reservas':
                return <GestionReservas />;
            default:
                return null;
        }
    };

    return (
        <div className="bg-gray-900 px-2 sm:px-4 lg:px-6 py-6 sm:py-8">
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto">
                {/* Sidebar */}
                <aside className="bg-gray-800 border border-gray-700 rounded-2xl p-4 h-fit flex flex-col gap-4 shadow-md sm:sticky top-4 z-10">
                    {/* Select mobile/tablet */}
                    <div className="block lg:hidden">
                        <label className="text-white text-sm font-medium mb-2">Secciones</label>
                        <select
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value)}
                            className="w-full bg-gray-700 text-white text-base p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all appearance-none"
                            style={{
                                minHeight: '48px',
                                fontSize: '1rem',
                                WebkitAppearance: 'none',
                                MozAppearance: 'none',
                                appearance: 'none'
                            }}
                        >
                            {tabs.map(tab => (
                                <option key={tab.id} value={tab.id}>
                                    {tab.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Sidebar en desktop */}
                    <div className="hidden lg:block">
                        <h1 className="text-lg font-bold text-white mb-1">Panel Admin</h1>
                        <p className="text-gray-400 text-xs mb-4">Gestión del sistema</p>
                        <nav className="flex flex-col gap-2">
                            {tabs.map((tab) => (
                                <Button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    texto={
                                        <span className="flex items-center gap-3">
                                            <span className="w-6 h-6 flex items-center justify-center">{tab.icon}</span>
                                            <span className="truncate">{tab.label}</span>
                                        </span>
                                    }
                                    variant={activeTab === tab.id ? "primary" : "default"}
                                    size="sm"
                                    className="w-full flex items-center justify-start rounded-lg text-left font-medium transition-all"
                                />
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Main Content */}
                <main>
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 sm:px-6 py-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-4 min-w-0">
                            <span className="text-3xl sm:text-5xl text-white">
                                {tabs.find(t => t.id === activeTab)?.icon}
                            </span>
                            <div>
                                <h2 className="text-lg sm:text-xl font-semibold text-white truncate">
                                    {tabs.find(t => t.id === activeTab)?.label}
                                </h2>
                                <p className="text-gray-400 text-xs mt-1">
                                    {activeTab === 'usuarios' && 'Administra todos los usuarios del sistema'}
                                    {activeTab === 'canchas' && 'Administra todas las canchas del sistema'}
                                    {activeTab === 'stats' && 'Visualiza estadísticas del sistema'}
                                </p>
                            </div>
                        </div>
                        {activeTab === 'usuarios' && (
                            <Button
                                texto="Crear Usuario"
                                onClick={() => setModalCrearAbierto(true)}
                                variant="primary"
                                size="md"
                                className="rounded-lg font-semibold shadow w-full sm:w-auto"
                                icon={<span className="text-base">+</span>}
                            />
                        )}
                        {activeTab === 'canchas' && (
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

                    {/* Content Area */}
                    <div
                        className="overflow-y-auto overflow-x-hidden bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-6xl mx-auto min-w-0"
                        style={{ maxHeight: '75vh' }}
                    >
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className="p-4 sm:p-6 min-w-0"
                        >
                            {renderContent()}
                        </motion.div>
                    </div>
                </main>
            </div>

            {/* Modal */}
            <Modal isOpen={modalCrearAbierto} onClose={() => setModalCrearAbierto(false)}>
                <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
                    <h5 className="text-xl font-bold text-white">
                        {activeTab === 'usuarios' ? 'Crear Nuevo Usuario' : 'Crear Nueva Cancha'}
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
                    {activeTab === 'usuarios' && (
                        <RegisterInline onUsuarioCreado={handleUsuarioCreado} />
                    )}
                    {activeTab === 'canchas' && (
                        <CrearCanchaInline onCanchaCreada={handleCanchaCreada} />
                    )}
                </div>
            </Modal>
        </div>
    );
}

export default AdminDashboard;
