import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUsuarios } from "../../../usuarios/hooks/useUsuarios";
import { useBusquedaUsuarios } from "../../../usuarios/hooks/useBusquedaUsuarios";
import { useModales } from "../../../../shared/hooks/useModales";
import BarraBusqueda from "../../../../shared/components/ui/SearchBar/BarraBusqueda";
import ListaUsuarios from "../../../usuarios/pages/ListaUsuarios";
import ModalesUsuario from "../../../usuarios/pages/ModalesUsuario";
import Paginacion from "../../../../shared/components/ui/Paginacion";
import Button from "../../../../shared/components/ui/Button/Button";
import { MdLayers, MdPersonAdd } from "react-icons/md";

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
    <section className="w-full space-y-6">
      
      {/* HEADER */}
      <div className="bg-slate-900/60 border border-slate-700/70 rounded-xl p-5 shadow-lg flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Usuarios</h2>
            <p className="text-sm text-gray-400 mt-1">Administración de cuentas y permisos</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <Button
              texto="Categorías"
              onClick={() => navigate("/panel-control/usuarios/categorias")}
              variant="secondary"
              size="md"
              icon={<MdLayers size={18} />}
              className="flex-1 sm:flex-none justify-center"
            />
            <Button
              texto="Nuevo Usuario"
              onClick={() => navigate("/panel-control/usuarios/nuevo")}
              variant="default"
              size="md"
              icon={<MdPersonAdd size={18} />}
              className="flex-1 sm:flex-none justify-center"
            />
          </div>
        </div>

        <div className="w-full">
            <BarraBusqueda
              onBuscar={buscar}
              onLimpiar={limpiar}
              modoBusqueda={modoBusqueda}
              resultados={resultados}
              loading={loadingBusqueda}
            />
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="w-full space-y-4">
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
      </div>
    </section>
  );
}

export default GestionUsuarios;