import { useEffect, useState, useCallback, useContext } from 'react';
import backendClient from '../../../../shared/services/backendClient';
import { successToast, errorToast } from '../../../../shared/utils/apiHelpers';
import Button from '../../../../shared/components/ui/Button/Button';
// CORRECCIÓN: Subir 3 niveles para llegar a 'features/auth'
import { AuthContext } from '../../../auth/context/AuthContext';
import MessageConfirm from "../../../../shared/components/ui/Confirm/MessageConfirm";
import { FiTrash2, FiEdit2, FiPlus, FiSave, FiX } from "react-icons/fi";

export default function ModalHorarios({ onClose }) {
  const { hasRole } = useContext(AuthContext);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newHora, setNewHora] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editHora, setEditHora] = useState('');

  const canAdmin = hasRole('admin');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await backendClient.get('horarios/listar');
      setRows(data);
    } catch (e) {
      errorToast(e?.message || 'Error cargando horarios');
    } finally {
      setLoading(false);
    }
  }, []);

  const [confirmData, setConfirmData] = useState({ open: false, id: null, mensaje: "" });

  useEffect(() => { load(); }, [load]);

  const createHorario = async () => {
    if (!newHora.trim()) return;
    setCreating(true);
    try {
      await backendClient.post('horarios/crear', { hora: newHora.trim() });
      successToast('Horario creado');
      setNewHora('');
      load();
    } catch (e) {
      errorToast(e?.data?.detail || e?.message || 'Error al crear');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditHora(row.hora);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditHora('');
  };

  const saveEdit = async () => {
    if (!editHora.trim()) return;
    try {
      await backendClient.put(`horarios/modificar/${editingId}`, { hora: editHora.trim() });
      successToast('Horario modificado');
      cancelEdit();
      load();
    } catch (e) {
      errorToast(e?.data?.detail || e?.message || 'Error al modificar');
    }
  };

  const deleteHorario = (id, hora) => {
    setConfirmData({ open: true, id, mensaje: `¿Eliminar el horario "${hora}"?` });
  };

  const ejecutarEliminacion = async () => {
    const id = confirmData.id;
    setConfirmData({ open: false, id: null, mensaje: "" });
    try {
      await backendClient.delete(`horarios/eliminar/${id}`);
      successToast("Horario eliminado");
      load();
    } catch (e) {
      errorToast(e?.data?.detail || e?.message || "No se pudo eliminar");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-700 pb-4">
        <h3 className="text-lg font-bold text-white">Gestión de Horarios</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white"><FiX size={24} /></button>
      </div>

      {canAdmin && (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Crear Nuevo Horario</label>
          <div className="flex gap-2">
            <input
              value={newHora}
              onChange={e => setNewHora(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-yellow-400 outline-none"
              placeholder="Ej: 19:00 - 20:30"
            />
            <Button onClick={createHorario} disabled={creating} variant="default" icon={<FiPlus />} texto="Agregar" />
          </div>
        </div>
      )}

      <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden max-h-[400px] overflow-y-auto">
        {loading ? (
            <div className="p-8 text-center text-gray-400">Cargando horarios...</div>
        ) : rows.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No hay horarios registrados.</div>
        ) : (
            <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-slate-800 border-b border-slate-700">
                    <tr>
                        <th className="px-4 py-3">Horario</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => (
                        <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="px-4 py-3 font-medium text-white">
                                {editingId === r.id ? (
                                    <input
                                        value={editHora}
                                        onChange={e => setEditHora(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white focus:border-yellow-400 outline-none"
                                    />
                                ) : r.hora}
                            </td>
                            <td className="px-4 py-3 text-right">
                                {editingId === r.id ? (
                                    <div className="flex justify-end gap-2">
                                        <button onClick={saveEdit} className="text-green-400 hover:text-green-300"><FiSave size={18} /></button>
                                        <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-300"><FiX size={18} /></button>
                                    </div>
                                ) : (
                                    canAdmin && (
                                        <div className="flex justify-end gap-3">
                                            <button onClick={() => startEdit(r)} className="text-slate-400 hover:text-yellow-400"><FiEdit2 size={18} /></button>
                                            <button onClick={() => deleteHorario(r.id, r.hora)} className="text-slate-400 hover:text-red-400"><FiTrash2 size={18} /></button>
                                        </div>
                                    )
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>

      {confirmData.open && (
        <MessageConfirm
          mensaje={confirmData.mensaje}
          onClose={() => setConfirmData({ ...confirmData, open: false })}
          onConfirm={ejecutarEliminacion}
          onCancel={() => setConfirmData({ ...confirmData, open: false })}
        />
      )}
    </div>
  );
}