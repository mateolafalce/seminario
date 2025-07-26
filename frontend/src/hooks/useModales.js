import { useState } from 'react';

// Hook para controlar el estado de los modales de usuario (crear, editar, eliminar)
export const useModales = () => {
  const [modalCrear, setModalCrear] = useState(false); // Modal para crear usuario
  const [modalEditar, setModalEditar] = useState(false); // Modal para editar usuario
  const [modalEliminar, setModalEliminar] = useState(false); // Modal para eliminar usuario
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null); // Usuario actual para editar/eliminar

  // Abrir/cerrar modal de crear
  const abrirCrear = () => setModalCrear(true);
  const cerrarCrear = () => setModalCrear(false);

  // Abrir/cerrar modal de editar
  const abrirEditar = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalEditar(true);
  };
  const cerrarEditar = () => {
    setModalEditar(false);
    setUsuarioSeleccionado(null);
  };

  // Abrir/cerrar modal de eliminar
  const abrirEliminar = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalEliminar(true);
  };
  const cerrarEliminar = () => {
    setModalEliminar(false);
    setUsuarioSeleccionado(null);
  };

  // Exporta estados y funciones de control
  return {
    modalCrear,
    modalEditar,
    modalEliminar,
    usuarioSeleccionado,
    abrirCrear,
    cerrarCrear,
    abrirEditar,
    cerrarEditar,
    abrirEliminar,
    cerrarEliminar,
  };
};