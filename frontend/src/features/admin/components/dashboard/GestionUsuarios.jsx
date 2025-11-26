import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion"; // <--- Importamos Motion
import { useUsuarios } from "../../../usuarios/hooks/useUsuarios";
import { useBusquedaUsuarios } from "../../../usuarios/hooks/useBusquedaUsuarios";
import { useModales } from "../../../../shared/hooks/useModales";
import BarraBusqueda from "../../../../shared/components/ui/SearchBar/BarraBusqueda";
import ListaUsuarios from "../../../usuarios/pages/ListaUsuarios";
import ModalesUsuario from "../../../usuarios/pages/ModalesUsuario";
import Paginacion from "../../../../shared/components/ui/Paginacion";
import Button from "../../../../shared/components/ui/Button/Button";
import { MdLayers, MdPersonAdd, MdPeopleAlt } from "react-icons/md";

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
  const {
    users, loading, error, currentPage, totalPages,
    fetchUsers, handlePageChange, editarUsuario, eliminarUsuario
  } = useUsuarios();

  const {
    resultados, loading: loadingBusqueda, error: errorBusqueda,
    modoBusqueda, terminoBusqueda, buscar, limpiar, eliminarDeResultados
  } = useBusquedaUsuarios();

  const modales = useModales();
  const [usuariosKey, setUsuariosKey] = useState(0);

  const usuariosParaMostrar = modoBusqueda ? resultados : users;
  const estasCargando = modoBusqueda ? loadingBusqueda : loading;
  const errorActual = modoBusqueda ? errorBusqueda : error;

  const handleEditar = async (usuarioData) => {
    const resultado = await editarUsuario(usuarioData);
    if (resultado.success) {
      if (modoBusqueda) buscar(terminoBusqueda);
      else fetchUsers(currentPage);
    }
    return resultado;
  };

  const handleEliminar = async (usuarioId) => {
    const resultado = await eliminarUsuario(usuarioId);
    if (resultado.success) {
      if (modoBusqueda) eliminarDeResultados(usuarioId);
      else fetchUsers(currentPage);
    }
    return resultado;
  };

  const handleUsuarioCreado = () => {
    modales.cerrarCrear();
    if (modoBusqueda && terminoBusqueda) {
      buscar(terminoBusqueda);
    } else {
      fetchUsers(currentPage);
      setUsuariosKey(k => k + 1);
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
          key={usuariosKey}
          usuarios={usuariosParaMostrar}
          loading={estasCargando}
          error={errorActual}
          onEditar={modales.abrirEditar}
          onEliminar={modales.abrirEliminar}
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

        <ModalesUsuario
           modales={modales}
           onEditar={handleEditar}
           onEliminar={handleEliminar}
           onUsuarioCreado={handleUsuarioCreado}
        />
      </motion.div>
    </motion.section>
  );
}

export default GestionUsuarios;