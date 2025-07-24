import React, { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import VerUsuarios from '../components/usuarios/VerUsuarios'
import BuscarCliente from '../pages/BuscarCliente'
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';

function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('usuarios');
    const [showModal, setShowModal] = useState(false);
    const { isAuthenticated, isAdmin } = useContext(AuthContext);
    const navigate = useNavigate();

    if (!isAuthenticated || !isAdmin) {
        return <p className="text-center text-red-400 mt-10">No tienes permisos para ver esta página.</p>
    }

    const tabs = [
        { id: 'usuarios', label: 'Ver Todos', icon: '👥' },
        { id: 'buscar', label: 'Buscar', icon: '🔍' },
        { id: 'crear', label: 'Crear Usuario', icon: '➕' },
        { id: 'stats', label: 'Estadísticas', icon: '📊' }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'usuarios':
                return (
                    <div className="bg-gray-800 rounded-xl p-6">
                        <h3 className="text-xl font-semibold text-white mb-4">Todos los Usuarios</h3>
                        <button 
                            onClick={() => setShowModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mb-4 transition-colors"
                        >
                            Ver Lista Completa
                        </button>
                        <VerUsuarios show={showModal} onHide={() => setShowModal(false)} />
                    </div>
                );
            
            case 'buscar':
                return (
                    <div className="bg-gray-800 rounded-xl p-6">
                        <h3 className="text-xl font-semibold text-white mb-4">Búsqueda Avanzada</h3>
                        <div className="bg-gray-900 rounded-lg p-4">
                            <BuscarCliente />
                        </div>
                    </div>
                );
            
            case 'crear':
                return (
                    <div className="bg-gray-800 rounded-xl p-6">
                        <h3 className="text-xl font-semibold text-white mb-4">Crear Nuevo Usuario</h3>
                        <div className="bg-gray-900 rounded-lg p-4">
                            <button 
                                onClick={() => navigate('/register?admin=1')}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
                            >
                                Ir a Formulario de Registro
                            </button>
                            <p className="text-gray-400 mt-2 text-sm">
                                Próximamente: Formulario inline integrado
                            </p>
                        </div>
                    </div>
                );
            
            case 'stats':
                return (
                    <div className="bg-gray-800 rounded-xl p-6">
                        <h3 className="text-xl font-semibold text-white mb-4">Estadísticas del Sistema</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-900 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-blue-400">--</div>
                                <div className="text-gray-400">Total Usuarios</div>
                            </div>
                            <div className="bg-gray-900 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-green-400">--</div>
                                <div className="text-gray-400">Activos</div>
                            </div>
                            <div className="bg-gray-900 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-yellow-400">--</div>
                                <div className="text-gray-400">Este Mes</div>
                            </div>
                        </div>
                        <p className="text-gray-400 mt-4 text-sm">
                            Próximamente: Métricas en tiempo real
                        </p>
                    </div>
                );
            
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Panel de Administración</h1>
                    <p className="text-gray-400">Gestión completa de usuarios y clientes</p>
                </div>

                {/* Navegación por tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-3 rounded-t-lg font-medium transition-all duration-300 ${
                                activeTab === tab.id
                                    ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Contenido del tab activo */}
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="min-h-[500px]"
                >
                    {renderContent()}
                </motion.div>
            </div>
        </div>
    );
}

export default AdminDashboard;