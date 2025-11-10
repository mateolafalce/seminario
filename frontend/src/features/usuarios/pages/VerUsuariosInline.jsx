import { useState } from "react";
import { useUsuarios } from "../../../hooks/useUsuarios";
import { useBusquedaUsuarios } from "../../../hooks/useBusquedaUsuarios";
import { useModales } from "../../../hooks/useModales";
import BarraBusqueda from "../../../components/common/SearchBar/BarraBusqueda.jsx";
import ListaUsuarios from "./ListaUsuarios";
import ModalesUsuario from "./ModalesUsuario";
import Paginacion from "../../../components/common/Paginacion.jsx";


function VerUsuariosInline() {

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
    setModalCrearAbierto(false);
    setUsuariosKey(k => k + 1);
  };

  return (
    <section className="w-full px-6 space-y-4">
      <BarraBusqueda
        onBuscar={buscar}
        onLimpiar={limpiar}
        modoBusqueda={modoBusqueda}
        resultados={resultados}
        loading={loadingBusqueda}
      />
      
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

        <div className="w-full rounded-xl p-4">
          <ModalesUsuario
            modales={modales}
            onEditar={handleEditar}
            onEliminar={handleEliminar}
            onUsuarioCreado={handleUsuarioCreado} // Pasar el handler al modal
          />
        </div>
      </div>
    </section>
  );
}

export default VerUsuariosInline;