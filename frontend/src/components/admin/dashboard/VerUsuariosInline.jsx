import React, { useEffect } from "react";
import { useUsuarios } from "../../../hooks/useUsuarios";
import { useBusquedaUsuarios } from "../../../hooks/useBusquedaUsuarios";
import { useModales } from "../../../hooks/useModales";
import BarraBusqueda from "./BarraBusqueda";
import ListaUsuarios from "./ListaUsuarios";
import Paginacion from "./Paginacion";
import ModalesUsuario from "./ModalesUsuario";

function VerUsuariosInline() {
  // Hooks personalizados
  const usuarios = useUsuarios();
  const busqueda = useBusquedaUsuarios();
  const modales = useModales();

  // Cargar usuarios al iniciar
  useEffect(() => {
    if (!busqueda.modoBusqueda) {
      usuarios.fetchUsers(usuarios.currentPage);
    }
  }, [usuarios.currentPage, busqueda.modoBusqueda]);

  // Manejar edición de usuario
  const handleEditar = async (usuarioData) => {
    const resultado = await usuarios.editarUsuario(usuarioData);
    
    if (resultado.success) {
      // Recargar datos después de editar
      if (busqueda.modoBusqueda) {
        busqueda.buscar(busqueda.terminoBusqueda);
      } else {
        usuarios.fetchUsers(usuarios.currentPage);
      }
    }
    
    return resultado;
  };

  // Manejar eliminación de usuario
  const handleEliminar = async (usuarioId) => {
    const resultado = await usuarios.eliminarUsuario(usuarioId);
    
    if (resultado.success) {
      // Actualizar datos después de eliminar
      if (busqueda.modoBusqueda) {
        busqueda.eliminarDeResultados(usuarioId);
      } else {
        usuarios.fetchUsers(usuarios.currentPage);
      }
    }
    
    return resultado;
  };

  // Determinar qué usuarios mostrar
  const usuariosParaMostrar = busqueda.modoBusqueda ? busqueda.resultados : usuarios.users;
  const estasCargando = busqueda.modoBusqueda ? busqueda.loading : usuarios.loading;
  const error = busqueda.modoBusqueda ? busqueda.error : usuarios.error;

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <BarraBusqueda
        onBuscar={busqueda.buscar}
        onLimpiar={() => {
          busqueda.limpiar();
          usuarios.fetchUsers(1);
        }}
        modoBusqueda={busqueda.modoBusqueda}
        resultados={busqueda.resultados}
        loading={estasCargando}
      />

      {/* Lista de usuarios */}
      <ListaUsuarios
        usuarios={usuariosParaMostrar}
        loading={estasCargando}
        error={error}
        onEditar={modales.abrirEditar}
        onEliminar={modales.abrirEliminar}
        modoBusqueda={busqueda.modoBusqueda}
      />

      {/* Paginación */}
      {!busqueda.modoBusqueda && usuarios.totalPages > 1 && (
        <Paginacion
          currentPage={usuarios.currentPage}
          totalPages={usuarios.totalPages}
          onPageChange={usuarios.handlePageChange}
          loading={usuarios.loading}
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