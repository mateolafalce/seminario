import React from "react";
import { useUsuarios } from "../../../hooks/useUsuarios";
import { useBusquedaUsuarios } from "../../../hooks/useBusquedaUsuarios";
import { useModales } from "../../../hooks/useModales";
import BarraBusqueda from "./BarraBusqueda";
import ListaUsuarios from "./ListaUsuarios";
import ModalesUsuario from "./ModalesUsuario";
import Paginacion from "./Paginacion";
import Button from "../../common/Button/Button";

function VerUsuariosInline() {
  // Usuarios y paginación
  const {
    users, loading, error, currentPage, totalPages,
    fetchUsers, handlePageChange, editarUsuario, eliminarUsuario
  } = useUsuarios();
  // Verifica que useUsuarios retorna editarUsuario y eliminarUsuario correctamente

  // Búsqueda
  const {
    resultados, loading: loadingBusqueda, error: errorBusqueda,
    modoBusqueda, terminoBusqueda, buscar, limpiar, eliminarDeResultados
  } = useBusquedaUsuarios();

  // Modales
  const modales = useModales();

  // Determinar qué usuarios mostrar
  const usuariosParaMostrar = modoBusqueda ? resultados : users;
  const estasCargando = modoBusqueda ? loadingBusqueda : loading;
  const errorActual = modoBusqueda ? errorBusqueda : error;

  // Handlers para modales
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

  return (
    <div>
      {/* Buscador */}
      <BarraBusqueda
        onBuscar={buscar}
        onLimpiar={limpiar}
        modoBusqueda={modoBusqueda}
        resultados={resultados}
        loading={loadingBusqueda}
      />

      {/* Lista de usuarios */}
      <ListaUsuarios
        usuarios={usuariosParaMostrar}
        loading={estasCargando}
        error={errorActual}
        onEditar={modales.abrirEditar}
        onEliminar={modales.abrirEliminar}
        modoBusqueda={modoBusqueda}
      />

      {/* Paginación */}
      {!modoBusqueda && totalPages > 1 && (
        <Paginacion
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          loading={loading}
        />
      )}

      {/* Modales */}
      <ModalesUsuario
        modales={modales}
        onEditar={handleEditar}
        onEliminar={handleEliminar}
      />
    </div>
  );
}

export default VerUsuariosInline;