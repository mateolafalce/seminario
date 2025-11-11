import { useState } from "react";
import { useUsuarios } from "../../../usuarios/hooks/useUsuarios";
import { useBusquedaUsuarios } from "../../../usuarios/hooks/useBusquedaUsuarios";
import { useModales } from "../../../../shared/hooks/useModales";
import BarraBusqueda from "../../../../shared/components/ui/SearchBar/BarraBusqueda";
import ListaUsuarios from "../../../usuarios/pages/ListaUsuarios";
import ModalesUsuario from "../../../usuarios/pages/ModalesUsuario";
import Paginacion from "../../../../shared/components/ui/Paginacion";
import Button from "../../../../shared/components/ui/Button/Button";

function GestionUsuarios() {
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
    // cerrar modal de crear y refrescar vista actual
    modales.cerrarCrear();
    if (modoBusqueda && terminoBusqueda) {
      buscar(terminoBusqueda);
    } else {
      fetchUsers(currentPage);
      setUsuariosKey(k => k + 1);
    }
  };

  return (
    <section className="w-full px-6 space-y-4">
      {/* Header con búsqueda y "Nuevo usuario" */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <BarraBusqueda
            onBuscar={buscar}
            onLimpiar={limpiar}
            modoBusqueda={modoBusqueda}
            resultados={resultados}
            loading={loadingBusqueda}
          />
        </div>
        <div className="shrink-0 -mt-2 sm:mt-0">
          <Button
            texto="Nuevo usuario"
            onClick={modales.abrirCrear}
            variant="default"
            size="md"
          />
        </div>
      </div>

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
          <Paginacion
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            loading={loading}
          />
        )}

        <div className="w-full rounded-xl p-0">
          <ModalesUsuario
            modales={modales}
            onEditar={handleEditar}
            onEliminar={handleEliminar}
            onUsuarioCreado={handleUsuarioCreado}
          />
        </div>
      </div>
    </section>
  );
}

export default GestionUsuarios;
