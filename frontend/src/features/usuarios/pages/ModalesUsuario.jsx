import React, { useState, useEffect, useMemo } from 'react';
import Modal from "../../../shared/components/ui/Modal/Modal";
import Button from "../../../shared/components/ui/Button/Button";
import { IoMdAlert } from "react-icons/io";
import { BiSolidError } from "react-icons/bi";
import { GrStatusGood } from "react-icons/gr";
import useCategorias from '../../../shared/hooks/useCategorias';
import UsuarioForm from "../components/UsuarioForm.jsx";
import adminApi from '../../../shared/services/adminApi';
import { normalizeApiError, onlyDigits } from "../../../shared/utils/userValidation";

const ModalesUsuario = ({ modales, onEditar, onEliminar, onUsuarioCreado }) => {
  const [usuarioEditar, setUsuarioEditar] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', titulo: '', texto: '' });
  const [modalMensajeAbierto, setModalMensajeAbierto] = useState(false);
  const [createErrors, setCreateErrors] = useState({});
  const [creating, setCreating] = useState(false);

  // Defaults para crear (ref estable)
  const createDefaults = useMemo(() => ({
    nombre: "", apellido: "", email: "", categoria: "", habilitado: false, username: "", dni: ""
  }), []);

  useCategorias(); // para precargar categorías (el form ya las lee)
  const mostrarMensaje = (tipo, titulo, texto) => {
    setMensaje({ tipo, titulo, texto });
    setModalMensajeAbierto(true);
  };

  useEffect(() => {
    if (modales.usuarioSeleccionado && modales.modalEditar) {
      const sel = modales.usuarioSeleccionado;
      const p = sel?.persona || {};
      setUsuarioEditar({
        id: sel.id,
        nombre: (p?.nombre ?? sel?.nombre) || '',
        apellido: (p?.apellido ?? sel?.apellido) || '',
        email: (p?.email ?? sel?.email) || '',
        categoria:
          (typeof sel?.categoria === 'string' && sel.categoria.trim())
            ? sel.categoria
            : '',
        habilitado: !!sel?.habilitado,
        dni: sel?.dni || '',
        username: sel?.username || '',
      });
    }
  }, [modales.usuarioSeleccionado, modales.modalEditar]);

  // Crear
  const handleCrear = async (vals) => {
    try {
      setCreating(true);
      setCreateErrors({});

      const payload = {
        username: vals.username,
        password: vals.password,
        nombre: vals.nombre,
        apellido: vals.apellido,
        email: vals.email,
        habilitado: !!vals.habilitado,
        categoria: vals.categoria || null,
        dni: onlyDigits(vals.dni),
      };
      await adminApi.users.create(payload);

      modales.cerrarCrear();
      onUsuarioCreado?.();
      mostrarMensaje('success', '¡Creado!', 'Usuario creado correctamente');
    } catch (e) {
      const mapped = await normalizeApiError(e);
      setCreateErrors(mapped);
    } finally {
      setCreating(false);
    }
  };

  // Editar
  const handleEditar = async (vals) => {
    if (!onEditar) {
      return mostrarMensaje('error', 'Error', 'No se puede editar el usuario.');
    }
    const resultado = await onEditar(vals);
    if (resultado.success) {
      modales.cerrarEditar();
      mostrarMensaje('success', '¡Éxito!', 'Usuario actualizado correctamente');
    } else {
      mostrarMensaje('error', 'Error', `Error al modificar: ${resultado.error}`);
    }
  };

  // Eliminar
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
      {/* Modal CREAR */}
      <Modal isOpen={modales.modalCrear} onClose={modales.cerrarCrear}>
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
          <h5 className="text-xl font-bold text-white">Crear Usuario</h5>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-200 text-3xl font-bold focus:outline-none"
            onClick={modales.cerrarCrear}
          >
            ×
          </button>
        </div>
        <div className="px-6 py-6">
          <UsuarioForm
            key={modales.modalCrear ? 'create-open' : 'create-closed'}
            mode="create"
            initialValues={createDefaults}
            submitText="Crear"
            onSubmit={handleCrear}
            onCancel={modales.cerrarCrear}
            errores={createErrors}
            loading={creating}
          />
        </div>
      </Modal>

      {/* Modal EDITAR */}
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
            onSubmit={handleEditar}
            onCancel={modales.cerrarEditar}
            submitText="Guardar Cambios"
            mode="edit"
          />
        </div>
      </Modal>

      {/* Modal CONFIRMAR ELIMINAR */}
      <Modal isOpen={modales.modalEliminar} onClose={modales.cerrarEliminar} size="sm" closeOnOverlayClick={false}>
        <div className="px-6 py-6 text-center">
          <div className="flex justify-center items-center mb-4">
            <IoMdAlert className="text-blue-400 w-14 h-14" />
          </div>
          <h5 className="text-xl font-bold text-white mb-4">¿Estás seguro?</h5>
          <p className="text-gray-300 text-lg mb-6">
            ¿Eliminar al usuario <br />
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

      {/* Modal MENSAJES */}
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
