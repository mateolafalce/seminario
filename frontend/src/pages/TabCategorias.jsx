import { useEffect, useState, useCallback, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import categoriasApi from '../services/categoriasApi';
import Button from '../components/common/Button/Button';
import { successToast, errorToast } from '../utils/apiHelpers';

export default function TabCategorias() {
  const { hasRole, hasPerm } = useContext(AuthContext);
  const canAdmin = hasRole?.('admin') || hasPerm?.('categorias.*');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newNivel, setNewNivel] = useState(1);

  const [editingId, setEditingId] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editNivel, setEditNivel] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await categoriasApi.listar();
      // Normalizamos por si tu backend devuelve "orden" en vez de "nivel"
      setRows(
        (data || []).map(c => ({
          id: c.id,
          nombre: c.nombre,
          nivel: typeof c.nivel === 'number' ? c.nivel : (c.orden ?? 0),
        }))
      );
    } catch (e) {
      errorToast(e?.data?.detail || e?.message || 'Error cargando categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createCategoria = async () => {
    if (!newNombre.trim()) return;
    setCreating(true);
    try {
      await categoriasApi.crear({ nombre: newNombre.trim(), nivel: Number(newNivel || 0) });
      successToast('Categoría creada');
      setNewNombre('');
      setNewNivel(1);
      load();
    } catch (e) {
      errorToast(e?.data?.detail || e?.message || 'No se pudo crear');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditNombre(row.nombre);
    setEditNivel(row.nivel);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNombre('');
    setEditNivel(1);
  };

  const saveEdit = async () => {
    if (!editNombre.trim()) return;
    try {
      await categoriasApi.modificar(editingId, { nombre: editNombre.trim(), nivel: Number(editNivel || 0) });
      successToast('Categoría modificada');
      cancelEdit();
      load();
    } catch (e) {
      errorToast(e?.data?.detail || e?.message || 'No se pudo modificar');
    }
  };

  const deleteCategoria = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría?')) return;
    try {
      await categoriasApi.eliminar(id);
      successToast('Categoría eliminada');
      load();
    } catch (e) {
      errorToast(e?.data?.detail || e?.message || 'No se pudo eliminar');
    }
  };

  const content = useMemo(() => {
    if (loading) return <div className="p-4 text-slate-300">Cargando…</div>;
    if (!rows.length) return <div className="p-4 text-slate-300">No hay categorías aún.</div>;

    return (
      <ul className="space-y-2">
        {rows.map(r => (
          <li key={r.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.05] p-3">
            {editingId === r.id ? (
              <div className="flex-1 flex flex-wrap items-center gap-2">
                <input
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  className="bg-transparent border border-white/15 rounded px-2 py-1 text-white"
                  placeholder="Nombre"
                />
                <input
                  type="number" min={1} max={100}
                  value={editNivel}
                  onChange={e => setEditNivel(e.target.value)}
                  className="w-28 bg-transparent border border-white/15 rounded px-2 py-1 text-white"
                  placeholder="Nivel"
                />
                <Button texto="Guardar" onClick={saveEdit} />
                <Button texto="Cancelar" variant="secondary" onClick={cancelEdit} />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 text-white">
                  <span className="font-medium">{r.nombre}</span>
                  <span className="text-white/60 text-sm">Nivel: {r.nivel}</span>
                </div>
                {canAdmin && (
                  <div className="flex items-center gap-2">
                    <Button texto="Editar" variant="yellow" onClick={() => startEdit(r)} />
                    <Button texto="Eliminar" variant="danger" onClick={() => deleteCategoria(r.id)} />
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    );
  }, [rows, loading, editingId, editNombre, editNivel, canAdmin]);

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-semibold text-white">Categorías</h2>

      {canAdmin && (
        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
          <h3 className="text-white mb-2 font-medium">Crear nueva</h3>
          <div className="flex flex-wrap gap-2">
            <input
              value={newNombre}
              onChange={e => setNewNombre(e.target.value)}
              className="flex-1 min-w-[220px] bg-transparent border border-white/15 rounded px-2 py-1 text-white"
              placeholder="Ej: 4ta, Intermedia, Avanzada…"
            />
            <input
              type="number" min={1} max={100}
              value={newNivel}
              onChange={e => setNewNivel(e.target.value)}
              className="w-28 bg-transparent border border-white/15 rounded px-2 py-1 text-white"
              placeholder="Nivel"
            />
            <Button texto="Agregar" onClick={createCategoria} disabled={creating} />
          </div>
          <p className="text-white/50 text-xs mt-2">Tip: usá el nivel como ordinal (ej: 2, 3, 4, …) para la métrica de similitud.</p>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
        <h3 className="text-white mb-2 font-medium">Listado</h3>
        {content}
      </div>
    </div>
  );
}
