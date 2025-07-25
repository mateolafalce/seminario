import React, { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import GestionUsuarios from '../components/admin/dashboard/VerUsuariosInline';
import RegisterInline from '../components/admin/dashboard/RegisterInline';
import Modal from '../components/common/Modal/Modal';
import Button from '../components/common/Button/Button';

function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('usuarios');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
    const { isAuthenticated, isAdmin, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    if (!isAuthenticated || !isAdmin) {
        return (
            <div className="flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h2>
                    <p className="text-red-400">No tienes permisos para ver esta página.</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'usuarios', label: 'Gestión de Usuarios', icon: '👥', shortLabel: 'Usuarios' },
        { id: 'stats', label: 'Estadísticas', icon: '📊', shortLabel: 'Stats' }
    ];

    const handleUsuarioCreado = () => {
        setModalCrearAbierto(false);
        window.location.reload();
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'usuarios':
                return <GestionUsuarios />;
            case 'stats':
                return (
                    <div className="space-y-6">
                        {/* Stats responsivos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 p-6 rounded-xl text-center"
                            >
                                <div className="text-3xl font-bold text-blue-400 mb-2">--</div>
                                <div className="text-gray-300 text-sm">Total Usuarios</div>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 p-6 rounded-xl text-center"
                            >
                                <div className="text-3xl font-bold text-green-400 mb-2">--</div>
                                <div className="text-gray-300 text-sm">Usuarios Activos</div>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 p-6 rounded-xl text-center sm:col-span-2 lg:col-span-1"
                            >
                                <div className="text-3xl font-bold text-yellow-400 mb-2">--</div>
                                <div className="text-gray-300 text-sm">Nuevos Este Mes</div>
                            </motion.div>
                        </div>
                        
                        {/* Placeholder para más contenido */}
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
                            <div className="text-4xl mb-4">📈</div>
                            <h3 className="text-xl font-semibold text-white mb-2">Más estadísticas próximamente</h3>
                            <p className="text-gray-400">Gráficos y métricas detalladas en desarrollo</p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className=" bg-gray-900 px-2 sm:px-4 lg:px-6 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 max-w-7xl mx-auto">
                {/* Sidebar alineado a la izquierda */}
                <aside className="bg-gray-800 border border-gray-700 rounded-xl p-6 h-fit">
                    <h1 className="text-lg font-bold text-white mb-2">Panel Admin</h1>
                    <p className="text-gray-400 text-sm mb-6">Gestión del sistema</p>
                    <nav className="space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center justify-start gap-1 px-2 py-1 rounded-lg text-left text-sm font-medium transition-all duration-150 ${
                                    activeTab === tab.id
                                        ? 'bg-yellow-400 text-black shadow'
                                        : 'bg-gray-700 text-white hover:bg-yellow-500 hover:text-black'
                                }`}
                                style={{ minHeight: '28px' }}
                            >
                                <span className="text-base">{tab.icon}</span>
                                <span style={{ fontSize: '0.95em' }}>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Contenido principal */}
                <main className="flex flex-col min-w-0">
                    {/* Header del contenido */}
                    <div className="bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 rounded-xl px-6 py-2 mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl">{tabs.find(t => t.id === activeTab)?.icon}</span>
                            <div>
                                <h2 className="text-xl font-bold text-white truncate">
                                    {tabs.find(t => t.id === activeTab)?.label}
                                </h2>
                                <p className="text-gray-400 text-sm mt-0">
                                    {activeTab === 'usuarios' && 'Administra todos los usuarios del sistema'}
                                    {activeTab === 'stats' && 'Visualiza estadísticas del sistema'}
                                </p>
                            </div>
                        </div>
                        {/* Botón Crear Usuario usando tu componente Button */}
                        {activeTab === 'usuarios' && (
                            <Button
                                texto="Crear Usuario"
                                onClick={() => setModalCrearAbierto(true)}
                                variant="default"
                                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-6 py-2 rounded-full shadow-md transition-all duration-150"
                                icon={<span className="text-base">+</span>}
                            />
                        )}
                    </div>

                    {/* Área de contenido - AJUSTADO */}
                    <div
                        className="overflow-y-auto bg-gray-900 mt-2 rounded-xl border border-gray-700 w-full max-w-6xl mx-auto"
                        style={{ maxHeight: '70vh' }}
                    >
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className="p-4"
                        >
                            {renderContent()}
                        </motion.div>
                    </div>
                </main>
            </div>

            {/* Modal Crear Usuario */}
            <Modal isOpen={modalCrearAbierto} onClose={() => setModalCrearAbierto(false)}>
                <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
                    <h5 className="text-xl font-bold text-white">Crear Nuevo Usuario</h5>
                    <button
                        type="button"
                        className="text-gray-400 hover:text-gray-200 text-3xl font-bold focus:outline-none"
                        onClick={() => setModalCrearAbierto(false)}
                    >
                        ×
                    </button>
                </div>
                <div className="px-6 py-6">
                    <RegisterInline onUsuarioCreado={handleUsuarioCreado} />
                </div>
            </Modal>
        </div>
    );
}

export default AdminDashboard;