import React, { useState, useEffect } from 'react';
import Modal from "../../../components/common/Modal/Modal";
import Button from "../../../components/common/Button/Button";
import { IoMdAlert } from "react-icons/io";
import { BiSolidError } from "react-icons/bi";
import { GrStatusGood } from "react-icons/gr";
import useCategorias from '../../../hooks/useCategorias';
import UsuarioForm from "../components/UsuarioForm.jsx";

const ModalesUsuario = ({ modales, onEditar, onEliminar }) => {
  const [usuarioEditar, setUsuarioEditar] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', titulo: '', texto: '' });
  const [modalMensajeAbierto, setModalMensajeAbierto] = useState(false);

  const { nombres: categoriasNombres, loading: loadingCategorias } = useCategorias();

  useEffect(() => {
    if (modales.usuarioSeleccionado && modales.modalEditar) {
      const { id, nombre, apellido, email, categoria, habilitado } = modales.usuarioSeleccionado;
      setUsuarioEditar({
        id,
        nombre,
        apellido,
        email: email || '',
        categoria: typeof categoria === 'string' && categoria.trim() ? categoria : '',
        habilitado: !!habilitado
      });
    }
  }, [modales.usuarioSeleccionado, modales.modalEditar]);

  const mostrarMensaje = (tipo, titulo, texto) => {
    setMensaje({ tipo, titulo, texto });
    setModalMensajeAbierto(true);
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    if (!onEditar || !usuarioEditar) {
      return mostrarMensaje('error', 'Error', 'No se puede editar el usuario.');
    }
    const resultado = await onEditar(usuarioEditar);
    if (resultado.success) {
      modales.cerrarEditar();
      mostrarMensaje('success', '¡Éxito!', 'Usuario actualizado correctamente');
    } else {
      mostrarMensaje('error', 'Error', `Error al modificar: ${resultado.error}`);
    }
  };

  const handleEliminar = async () => {
    const resultado = await onEliminar(modales.usuarioSeleccionado.id);
    if (resultado.success) {
      modales.cerrarEliminar();
      mostrarMensaje('success', '¡Eliminado!', 'Usuario eliminado correctamente');
    } else {
      mostrarMensaje('error', 'Error', resultado.error);
    }
  };

  return (
    <>
      {/* Modal de edición */}
      <Modal isOpen={modales.modalEditar} onClose={modales.cerrarEditar}>
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
          <h5 className="text-xl font-bold text-white">Editar Usuario</h5>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-200 text-3xl font-bold focus:outline-none"
            onClick={modales.cerrarEditar}
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6">
          <UsuarioForm
            initialValues={usuarioEditar || { nombre:"", apellido:"", email:"", categoria:"", habilitado:false }}
            onSubmit={async (vals) => {
              const resultado = await onEditar(vals);
              if (resultado.success) {
                modales.cerrarEditar();
                mostrarMensaje('success', '¡Éxito!', 'Usuario actualizado correctamente');
              } else {
                mostrarMensaje('error', 'Error', `Error al modificar: ${resultado.error}`);
              }
            }}
            onCancel={modales.cerrarEditar}
            submitText="Guardar Cambios"
          />
        </div>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal isOpen={modales.modalEliminar} onClose={modales.cerrarEliminar} size="sm" closeOnOverlayClick={false}>
        <div className="px-6 py-6 text-center">
          <div className="flex justify-center items-center mb-4">
            <IoMdAlert className="text-blue-400 w-14 h-14" />
          </div>
          <h5 className="text-xl font-bold text-white mb-4">¿Estás seguro?</h5>
          <p className="text-gray-300 text-lg mb-6">
            ¿Realmente deseas eliminar al usuario <br />
            <span className="font-bold text-white">"{modales.usuarioSeleccionado?.nombre} {modales.usuarioSeleccionado?.apellido}"</span>?
            <br /><br />
            <span className="text-red-400 text-sm">Esta acción no se puede deshacer.</span>
          </p>
          <div className="flex gap-3">
            <Button type="button" texto="Cancelar" onClick={modales.cerrarEliminar} variant="cancelar" className="flex-1" />
            <Button type="button" texto="Sí, Eliminar" onClick={handleEliminar} variant="eliminar" className="flex-1" />
          </div>
        </div>
      </Modal>

      {/* Modal de mensajes */}
      <Modal isOpen={modalMensajeAbierto} onClose={() => setModalMensajeAbierto(false)} size="sm" role="alertdialog">
        <div
          className={`px-6 py-6 text-center rounded-b-2xl ${
            mensaje.tipo === 'success'
              ? 'border-green-400'
              : mensaje.tipo === 'error'
              ? 'border-red-400'
              : 'border-blue-400'
          }`}
        >
          <div className="mb-4 flex justify-center">
            {mensaje.tipo === 'success' && <GrStatusGood className="text-green-400 w-14 h-14" />}
            {mensaje.tipo === 'error' && <BiSolidError className="text-red-400 w-14 h-14" />}
            {!['success', 'error'].includes(mensaje.tipo) && <IoMdAlert className="text-blue-400 w-14 h-14" />}
          </div>
          <h5 className="text-xl font-bold mb-3 text-white">{mensaje.titulo}</h5>
          <p
            className={`text-base mb-6 font-medium ${
              mensaje.tipo === 'success'
                ? 'text-green-400'
                : mensaje.tipo === 'error'
                ? 'text-red-400'
                : 'text-blue-400'
            }`}
          >
            {mensaje.texto}
          </p>
          <Button
            type="button"
            texto="Entendido"
            onClick={() => setModalMensajeAbierto(false)}
            variant="default"
            className="w-full"
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
};

export default ModalesUsuario;
