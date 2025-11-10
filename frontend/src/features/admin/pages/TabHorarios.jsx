import { useEffect, useState, useCallback, useContext, useMemo } from 'react';
import backendClient from '../../../shared/services/backendClient';
import { successToast, errorToast } from '../../../shared/utils/apiHelpers';
import Button from '../../../shared/components/ui/Button/Button';
import { AuthContext } from '../../auth/context/AuthContext';

export default function TabHorarios() {
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

  const deleteHorario = async (id) => {
    if (!window.confirm('¿Eliminar este horario? Si está en uso, el backend lo bloqueará.')) return;
    try {
      await backendClient.delete(`horarios/eliminar/${id}`);
      successToast('Horario eliminado');
      load();
    } catch (e) {
      errorToast(e?.data?.detail || e?.message || 'No se pudo eliminar');
    }
  };

  const content = useMemo(() => {
    if (loading) return <div className="p-4 text-slate-300">Cargando…</div>;
    if (!rows.length) return <div className="p-4 text-slate-300">No hay horarios aún.</div>;

    return (
      <ul className="space-y-2">
        {rows.map(r => (
          <li key={r.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.05] p-3">
            {editingId === r.id ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  value={editHora}
                  onChange={e => setEditHora(e.target.value)}
                  className="flex-1 bg-transparent border border-white/15 rounded px-2 py-1 text-white"
                  placeholder="HH:MM-HH:MM"
                />
                <Button texto="Guardar" onClick={saveEdit} />
                <Button texto="Cancelar" variant="secondary" onClick={cancelEdit} />
              </div>
            ) : (
              <>
                <span className="text-white">{r.hora}</span>
                {canAdmin && (
                  <div className="flex items-center gap-2">
                    <Button texto="Editar" variant="yellow" onClick={() => startEdit(r)} />
                    <Button texto="Eliminar" variant="danger" onClick={() => deleteHorario(r.id)} />
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    );
  }, [rows, loading, editingId, editHora, canAdmin]);

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-semibold text-white">Horarios</h2>

      {canAdmin && (
        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
          <h3 className="text-white mb-2 font-medium">Crear nuevo</h3>
          <div className="flex gap-2">
            <input
              value={newHora}
              onChange={e => setNewHora(e.target.value)}
              className="flex-1 bg-transparent border border-white/15 rounded px-2 py-1 text-white"
              placeholder="Ej: 21:00-22:30"
            />
            <Button texto="Agregar" onClick={createHorario} disabled={creating} />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
        <h3 className="text-white mb-2 font-medium">Listado</h3>
        {content}
      </div>
    </div>
  );
}
