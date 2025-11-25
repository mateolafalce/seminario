import { useEffect, useState, useCallback, useContext } from 'react';
import { AuthContext } from '../../../auth/context/AuthContext'; 
import categoriasApi from '../../../../shared/services/categoriasApi';
import Button from '../../../../shared/components/ui/Button/Button';
import { successToast, errorToast } from '../../../../shared/utils/apiHelpers';
import { FiTrash2, FiEdit2, FiPlus, FiSave, FiX } from "react-icons/fi";

export default function ModalCategorias({ onClose }) {
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
      setRows((data || []).map(c => ({
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-700 pb-4">
        <div>
            <h3 className="text-xl font-bold text-white">Categorías</h3>
            <p className="text-sm text-gray-400">Niveles de usuario y jerarquías</p>
        </div>
        <button onClick={onClose} className="p-2 bg-slate-800 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition"><FiX size={20} /></button>
      </div>

      {canAdmin && (
        <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50">
           <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider mb-4">Crear Nueva Categoría</h4>
           <div className="grid grid-cols-[1fr_100px_auto] gap-4 items-end">
             <div>
                <label className="block text-xs text-gray-400 mb-1.5 ml-1">Nombre</label>
                <input
                    value={newNombre}
                    onChange={e => setNewNombre(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:border-yellow-400 outline-none transition-colors"
                    placeholder="Ej: Experto"
                />
             </div>
             <div>
                <label className="block text-xs text-gray-400 mb-1.5 ml-1">Nivel</label>
                <input
                    type="number" min={1} max={100}
                    value={newNivel}
                    onChange={e => setNewNivel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-center focus:border-yellow-400 outline-none transition-colors"
                    placeholder="1"
                />
             </div>
             <div className="h-[42px]">
                <Button onClick={createCategoria} disabled={creating} variant="default" icon={<FiPlus />} texto="Agregar" className="h-full" />
             </div>
           </div>
           <p className="text-gray-500 text-xs mt-3 flex items-center gap-2">
             <span className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">i</span>
             El nivel numérico define la jerarquía (1 es el más bajo).
           </p>
        </div>
      )}

      <div className="bg-slate-900/40 rounded-xl border border-slate-700 overflow-hidden max-h-[400px] overflow-y-auto">
         {loading ? (
             <div className="p-8 text-center text-gray-400 animate-pulse">Cargando datos...</div>
         ) : rows.length === 0 ? (
             <div className="p-8 text-center text-gray-400">No hay categorías registradas.</div>
         ) : (
             <table className="w-full text-sm text-left text-gray-300">
                 <thead className="text-xs text-gray-400 uppercase bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
                     <tr>
                         <th className="px-5 py-3.5 w-24 text-center">Nivel</th>
                         <th className="px-5 py-3.5">Nombre</th>
                         <th className="px-5 py-3.5 text-right">Acciones</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/50">
                     {rows.map(r => (
                         <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                             <td className="px-5 py-3 text-center">
                                 {editingId === r.id ? (
                                     <input type="number" value={editNivel} onChange={e => setEditNivel(e.target.value)} className="w-16 bg-slate-800 border border-slate-600 rounded px-1 py-1 text-white text-center focus:border-yellow-400 outline-none" />
                                 ) : <span className="inline-block w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white mx-auto">{r.nivel}</span>}
                             </td>
                             <td className="px-5 py-3 font-medium text-white">
                                 {editingId === r.id ? (
                                     <input value={editNombre} onChange={e => setEditNombre(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white focus:border-yellow-400 outline-none" />
                                 ) : r.nombre}
                             </td>
                             <td className="px-5 py-3 text-right">
                                 {editingId === r.id ? (
                                     <div className="flex justify-end gap-2">
                                         <button onClick={saveEdit} className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition"><FiSave size={16} /></button>
                                         <button onClick={cancelEdit} className="p-2 bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white rounded-lg transition"><FiX size={16} /></button>
                                     </div>
                                 ) : canAdmin && (
                                     <div className="flex justify-end gap-2">
                                         <button onClick={() => startEdit(r)} className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition"><FiEdit2 size={16} /></button>
                                         <button onClick={() => deleteCategoria(r.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"><FiTrash2 size={16} /></button>
                                     </div>
                                 )}
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         )}
      </div>
    </div>
  );
}