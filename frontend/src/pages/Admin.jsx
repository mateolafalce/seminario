import React, { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import VerUsuarios from '../components/usuarios/VerUsuarios'
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import IconoAvatar from '../assets/icons/iconoAvatar';

function Admin() {
    const [showModal, setShowModal] = useState(false);
    const { isAuthenticated, isAdmin } = useContext(AuthContext);
    const navigate = useNavigate();

    if (!isAuthenticated || !isAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <p className="text-center text-red-400 text-xl">No tienes permisos para ver esta página.</p>
        </div>
      );
    }

    const adminOptions = [
      {
        title: "Listar Usuarios",
        description: "Visualiza y gestiona usuarios del sistema",
        icon: <IconoAvatar />,
        action: () => setShowModal(true),
        primary: true
      },
      {
        title: "Crear Cliente",
        description: "Registrar un nuevo cliente",
        icon: (
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
        ),
        action: () => navigate('/register?admin=1'),
        primary: false
      },
      {
        title: "Buscar Cliente",
        description: "Encontrar clientes existentes",
        icon: (
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        ),
        action: () => navigate('/clientes/buscar'),
        primary: false
      }
    ];

    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-[#0D1B2A] via-[#1B2A3A] to-[#0D1B2A] px-4 py-8">
          {/* Header minimalista */}
          <motion.div 
            className="text-center mb-12 mt-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-extralight text-white mb-4">
              Panel de <span className="text-[#E5FF00]">Administración</span>
            </h1>
            <p className="text-white/60 text-lg font-light">
              Gestiona usuarios y clientes del sistema
            </p>
          </motion.div>

          {/* Grid de opciones responsive */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminOptions.map((option, index) => (
                <motion.div
                  key={option.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`
                    ${option.primary ? 'md:col-span-2 lg:col-span-1' : ''}
                    group cursor-pointer
                  `}
                  onClick={option.action}
                >
                  <div className="
                    bg-white/5 backdrop-blur-sm border border-white/10 
                    rounded-2xl p-8 h-full
                    transition-all duration-300 ease-out
                    hover:bg-white/10 hover:border-[#E5FF00]/30 
                    hover:scale-105 hover:shadow-2xl
                    active:scale-100
                  ">
                    {/* Icono */}
                    <div className="flex justify-center mb-6">
                      <div className="
                        w-16 h-16 rounded-full bg-white/10 
                        flex items-center justify-center
                        group-hover:bg-[#E5FF00]/20 
                        transition-all duration-300
                      ">
                        {option.icon}
                      </div>
                    </div>
                    
                    {/* Contenido */}
                    <div className="text-center">
                      <h3 className="
                        text-xl font-light text-white mb-3
                        group-hover:text-[#E5FF00] 
                        transition-colors duration-300
                      ">
                        {option.title}
                      </h3>
                      <p className="
                        text-white/60 text-sm font-extralight leading-relaxed
                        group-hover:text-white/80 
                        transition-colors duration-300
                      ">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Estadísticas rápidas (opcional) */}
          <motion.div 
            className="max-w-4xl mx-auto mt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Usuarios", value: "---" },
                { label: "Clientes", value: "---" },
                { label: "Reservas", value: "---" },
                { label: "Categorías", value: "7" }
              ].map((stat, index) => (
                <div 
                  key={stat.label}
                  className="
                    text-center p-4 
                    bg-white/5 backdrop-blur-sm 
                    border border-white/10 
                    rounded-xl
                  "
                >
                  <div className="text-2xl font-light text-[#E5FF00] mb-1">
                    {stat.value}
                  </div>
                  <div className="text-white/60 text-xs font-extralight uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Modal de usuarios */}
        <VerUsuarios show={showModal} onHide={() => setShowModal(false)} />
      </>
    );
}

export default Admin;