import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal/Modal';
import Button from '../../common/Button/Button';

const categorias = ['2da','3ra','4ta', '5ta','6ta', '7ta', '8ta'];

const ModalesUsuario = ({ 
  modales, 
  onEditar, 
  onEliminar,
  onMostrarMensaje 
}) => {
  const [usuarioEditar, setUsuarioEditar] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', titulo: '', texto: '' });
  const [modalMensajeAbierto, setModalMensajeAbierto] = useState(false);

  // Sincronizar usuario seleccionado con estado local
  useEffect(() => {
    if (modales.usuarioSeleccionado && modales.modalEditar) {
      setUsuarioEditar({
        id: modales.usuarioSeleccionado.id,
        nombre: modales.usuarioSeleccionado.nombre,
        apellido: modales.usuarioSeleccionado.apellido,
        email: modales.usuarioSeleccionado.email,
        categoria: modales.usuarioSeleccionado.categoria || "",
        habilitado: modales.usuarioSeleccionado.habilitado,
      });
    }
  }, [modales.usuarioSeleccionado, modales.modalEditar]);

  // Función para mostrar mensajes
  const mostrarMensaje = (tipo, titulo, texto) => {
    setMensaje({ tipo, titulo, texto });
    setModalMensajeAbierto(true);
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    if (!onEditar) {
      mostrarMensaje('error', 'Error', 'No se puede editar el usuario. Función no disponible.');
      return;
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
      {/* Modal Editar */}
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
          <form onSubmit={handleEditar} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <input 
                type="text" 
                value={usuarioEditar?.nombre || ''} 
                onChange={(e) => setUsuarioEditar({...usuarioEditar, nombre: e.target.value})} 
                className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-[#E5FF00]" 
                placeholder="Nombre"
                required
              />
              <input 
                type="text" 
                value={usuarioEditar?.apellido || ''} 
                onChange={(e) => setUsuarioEditar({...usuarioEditar, apellido: e.target.value})} 
                className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-[#E5FF00]" 
                placeholder="Apellido"
                required
              />
              <input 
                type="email" 
                value={usuarioEditar?.email || ''} 
                onChange={(e) => setUsuarioEditar({...usuarioEditar, email: e.target.value})} 
                className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-[#E5FF00]" 
                placeholder="Email"
                required
              />
              <select 
                value={usuarioEditar?.categoria || ''} 
                onChange={(e) => setUsuarioEditar({...usuarioEditar, categoria: e.target.value})} 
                className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-[#E5FF00]"
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            
            <div className="flex items-center gap-3 py-2">
              <input 
                type="checkbox" 
                checked={usuarioEditar?.habilitado || false} 
                onChange={(e) => setUsuarioEditar({...usuarioEditar, habilitado: e.target.checked})} 
                className="accent-[#E5FF00] w-5 h-5" 
              />
              <label className="text-white">Usuario habilitado</label>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                texto="Guardar Cambios" 
                variant="default" 
                className="flex-1"
              />
              <Button 
                type="button" 
                texto="Cancelar" 
                onClick={modales.cerrarEditar} 
                variant="cancelar" 
                className="flex-1"
              />
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal Eliminar */}
      <Modal 
        isOpen={modales.modalEliminar} 
        onClose={modales.cerrarEliminar}
        size="sm"
        closeOnOverlayClick={false}
      >
        <div className="px-6 py-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h5 className="text-xl font-bold text-white mb-4">¿Estás seguro?</h5>
          <p className="text-gray-300 text-lg mb-6">
            ¿Realmente deseas eliminar al usuario <br/>
            <span className="font-bold text-white">"{modales.usuarioSeleccionado?.nombre} {modales.usuarioSeleccionado?.apellido}"</span>?
            <br/><br/>
            <span className="text-red-400 text-sm">Esta acción no se puede deshacer.</span>
          </p>
          
          <div className="flex gap-3">
            <Button 
              type="button" 
              texto="Cancelar" 
              onClick={modales.cerrarEliminar} 
              variant="cancelar" 
              className="flex-1"
            />
            <Button 
              type="button" 
              texto="Sí, Eliminar" 
              onClick={handleEliminar} 
              variant="eliminar" 
              className="flex-1"
            />
          </div>
        </div>
      </Modal>

      {/* Modal Mensajes */}
      <Modal 
        isOpen={modalMensajeAbierto} 
        onClose={() => setModalMensajeAbierto(false)}
        size="sm"
      >
        <div className="px-6 py-6 text-center">
          <div className="text-4xl mb-4">
            {mensaje.tipo === 'success' ? '✅' : mensaje.tipo === 'error' ? '❌' : 'ℹ️'}
          </div>
          <h5 className="text-xl font-bold text-white mb-4">{mensaje.titulo}</h5>
          <p className={`text-lg mb-6 ${mensaje.tipo === 'success' ? 'text-green-400' : mensaje.tipo === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
            {mensaje.texto}
          </p>
          
          <Button 
            type="button" 
            texto="Entendido" 
            onClick={() => setModalMensajeAbierto(false)} 
            variant="default"
            className="w-full"
          />
        </div>
      </Modal>
    </>
  );
};

export default ModalesUsuario;