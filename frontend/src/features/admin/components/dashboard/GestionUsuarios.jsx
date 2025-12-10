import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion"; 
import { toast } from "react-toastify"; // Import toast
import MiToast from "../../../../shared/components/ui/Toast/MiToast"; // Import MiToast
import { useUsuarios } from "../../../usuarios/hooks/useUsuarios";
import { useBusquedaUsuarios } from "../../../usuarios/hooks/useBusquedaUsuarios";
import BarraBusqueda from "../../../../shared/components/ui/SearchBar/BarraBusqueda";
import ListaUsuarios from "../../../usuarios/pages/ListaUsuarios";
import Paginacion from "../../../../shared/components/ui/Paginacion";
import Button from "../../../../shared/components/ui/Button/Button";
import { MdLayers, MdPersonAdd, MdPeopleAlt, MdWarning } from "react-icons/md";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { y: 10, opacity: 0, filter: "blur(2px)" },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 260, damping: 20 }
  }
};

function GestionUsuarios() {
  const navigate = useNavigate();
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
  const {
    users, loading, error, currentPage, totalPages,
    fetchUsers, handlePageChange, eliminarUsuario
  } = useUsuarios();

  const {
    resultados, loading: loadingBusqueda, error: errorBusqueda,
    modoBusqueda, buscar, limpiar, eliminarDeResultados
  } = useBusquedaUsuarios();

  const usuariosParaMostrar = modoBusqueda ? resultados : users;
  const estasCargando = modoBusqueda ? loadingBusqueda : loading;
  const errorActual = modoBusqueda ? errorBusqueda : error;

  const handleEditar = (usuario) => {
    navigate(`/panel-control/usuarios/editar/${usuario.id}`, {
      state: { usuario },
    });
  };

  const handleEliminar = (usuario) => {
    setUsuarioAEliminar(usuario);
  };

  const confirmarEliminacion = async () => {
    if (!usuarioAEliminar) return;

    const resultado = await eliminarUsuario(usuarioAEliminar.id);
    if (resultado.success) {
      toast(<MiToast mensaje="Usuario eliminado correctamente" color="#10b981" />); // Add toast
      if (modoBusqueda) {
        eliminarDeResultados(usuarioAEliminar.id);
      } else {
        fetchUsers(currentPage);
      }
      setUsuarioAEliminar(null);
    } else {
      toast(<MiToast mensaje={resultado.error || "Error al eliminar usuario"} color="#ef4444" />); // Add error toast
    }
  };

  return (
    <motion.section 
      className="w-full space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      
      {/* ITEM 1: HEADER */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
               <span className="text-yellow-400"><MdPeopleAlt /></span>
               Usuarios
            </h2>
            <p className="text-slate-400 mt-2 text-sm">Administración de cuentas, perfiles y permisos de acceso.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
             <Button
              texto="Categorías"
              onClick={() => navigate("/panel-control/usuarios/categorias")}
              variant="secondary"
              icon={<MdLayers size={18} />}
              className="flex-1 md:flex-none justify-center"
            />
            <Button
              texto="Nuevo Usuario"
              onClick={() => navigate("/panel-control/usuarios/nuevo")}
              variant="default"
              icon={<MdPersonAdd size={20} />}
              className="flex-1 md:flex-none justify-center shadow-lg shadow-yellow-400/10"
            />
          </div>
      </motion.div>

      {/* ITEM 2: BUSCADOR */}
      <motion.div variants={itemVariants} className="w-full max-w-2xl">
          <BarraBusqueda
            onBuscar={buscar}
            onLimpiar={limpiar}
            modoBusqueda={modoBusqueda}
            resultados={resultados}
            loading={loadingBusqueda}
          />
      </motion.div>

      {/* ITEM 3: LISTA Y MODALES */}
      <motion.div variants={itemVariants} className="w-full space-y-4">
        <ListaUsuarios
          usuarios={usuariosParaMostrar}
          loading={estasCargando}
          error={errorActual}
          onEditar={handleEditar}
          onEliminar={handleEliminar}
          modoBusqueda={modoBusqueda}
        />

        {!modoBusqueda && totalPages > 1 && (
          <div className="flex justify-center pt-2">
            <Paginacion
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              loading={loading}
            />
          </div>
        )}
      </motion.div>

      {/* MODAL DE CONFIRMACIÓN */}
      <AnimatePresence>
        {usuarioAEliminar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setUsuarioAEliminar(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                  <MdWarning size={28} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">¿Eliminar usuario?</h3>
                <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                  Estás a punto de eliminar a <strong className="text-white">
                    {(usuarioAEliminar.nombre || usuarioAEliminar.persona?.nombre || "").trim()} {(usuarioAEliminar.apellido || usuarioAEliminar.persona?.apellido || "").trim() || `ID ${usuarioAEliminar.id}`}
                  </strong>. 
                  <br/>Esta acción es irreversible y eliminará todos los datos asociados.
                </p>
                
                <div className="flex gap-3 w-full">
                  <Button 
                    texto="Cancelar" 
                    onClick={() => setUsuarioAEliminar(null)}
                    variant="secondary"
                    className="flex-1 justify-center"
                  />
                  <Button 
                    texto="Sí, eliminar" 
                    onClick={confirmarEliminacion}
                    className="flex-1 justify-center bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20 border-transparent"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

export default GestionUsuarios;