import { useEffect, useState, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../auth/context/AuthContext';
import categoriasApi from '../../../shared/services/categoriasApi';
import Button from '../../../shared/components/ui/Button/Button';
import { successToast, errorToast } from '../../../shared/utils/apiHelpers';
import { FiTrash2, FiEdit2, FiPlus, FiSave, FiX, FiArrowLeft } from "react-icons/fi";

export default function PageCategorias() {
  const navigate = useNavigate();
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
      const nivelNum = Math.max(1, Number(newNivel || 1)); // nunca < 1
      await categoriasApi.crear({
        nombre: newNombre.trim(),
        nivel: nivelNum,
      });
      successToast('Categoría creada');
      setNewNombre('');
      setNewNivel(1);
      load();
    } catch (e) {
      // mejor lectura del error
      const msg = e.response?.data?.detail || e.message || 'No se pudo crear';
      errorToast(msg);
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
      const nivelNum = Math.max(1, Number(editNivel || 1));
      await categoriasApi.modificar(editingId, {
        nombre: editNombre.trim(),
        nivel: nivelNum,
      });
      successToast('Categoría modificada');
      cancelEdit();
      load();
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'No se pudo modificar';
      errorToast(msg);
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
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 border-b border-gray-700 pb-6">
        <button 
            onClick={() => navigate("/panel-control/usuarios")}
            className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-full transition"
        >
            <FiArrowLeft size={24} />
        </button>
        <div>
            <h2 className="text-2xl font-bold text-white">Gestión de Categorías</h2>
            <p className="text-gray-400 text-sm">Define los niveles y jerarquías de los usuarios.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO CREAR */}
        {canAdmin && (
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-900/60 border border-slate-700/70 p-6 rounded-xl shadow-lg sticky top-6">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">Nueva Categoría</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Nombre</label>
                            <input
                                value={newNombre}
                                onChange={e => setNewNombre(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:border-yellow-400 outline-none transition-colors placeholder:text-gray-600"
                                placeholder="Ej: Experto, Principiante..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Nivel Jerárquico</label>
                            <input
                                type="number" min={1} max={100}
                                value={newNivel}
                                onChange={e => setNewNivel(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:border-yellow-400 outline-none transition-colors"
                                placeholder="1"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                El número define el orden (1 es el más bajo).
                            </p>
                        </div>
                        <div className="pt-2">
                            <Button 
                                onClick={createCategoria} 
                                disabled={creating} 
                                variant="default" 
                                icon={<FiPlus />} 
                                texto={creating ? "Creando..." : "Agregar Categoría"} 
                                className="w-full justify-center"
                            />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* COLUMNA DERECHA: LISTADO */}
        <div className="lg:col-span-2">
            <div className="bg-slate-900/60 border border-slate-700/70 rounded-xl shadow-lg overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Cargando categorías...</div>
                ) : rows.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                        <span className="text-lg mb-2">Lista vacía</span>
                        <span className="text-sm opacity-70">Agrega la primera categoría desde el panel izquierdo.</span>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-400 uppercase bg-slate-800 border-b border-slate-700">
                            <tr>
                                <th className="px-6 py-4 w-24 text-center">Nivel</th>
                                <th className="px-6 py-4">Nombre</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {rows.map(r => (
                                <tr key={r.id} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-6 py-4 text-center">
                                        {editingId === r.id ? (
                                            <input type="number" value={editNivel} onChange={e => setEditNivel(e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded px-1 py-1 text-white text-center focus:border-yellow-400 outline-none" />
                                        ) : (
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-white">
                                                {r.nivel}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white">
                                        {editingId === r.id ? (
                                            <input value={editNombre} onChange={e => setEditNombre(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white focus:border-yellow-400 outline-none" />
                                        ) : r.nombre}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {editingId === r.id ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={saveEdit} className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition"><FiSave size={18} /></button>
                                                <button onClick={cancelEdit} className="p-2 bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white rounded-lg transition"><FiX size={18} /></button>
                                            </div>
                                        ) : canAdmin && (
                                            <div className="flex justify-end gap-3">
                                                <button onClick={() => startEdit(r)} className="text-slate-400 hover:text-yellow-400 transition"><FiEdit2 size={18} /></button>
                                                <button onClick={() => deleteCategoria(r.id)} className="text-slate-400 hover:text-red-400 transition"><FiTrash2 size={18} /></button>
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
      </div>
    </div>
  );
}