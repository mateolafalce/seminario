import { useState } from 'react';

export const useModales = () => {
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

  const abrirCrear = () => setModalCrear(true);
  const cerrarCrear = () => setModalCrear(false);

  const abrirEditar = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalEditar(true);
  };
  const cerrarEditar = () => {
    setModalEditar(false);
    setUsuarioSeleccionado(null);
  };

  const abrirEliminar = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalEliminar(true);
  };
  const cerrarEliminar = () => {
    setModalEliminar(false);
    setUsuarioSeleccionado(null);
  };

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