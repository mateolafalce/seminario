import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Importar useNavigate
import adminApi from '../../../../shared/services/adminApi';
import backendClient from '../../../../shared/services/backendClient';
import Paginacion from '../../../../shared/components/ui/Paginacion';
import { toast } from 'react-toastify';
import MiToast from '../../../../shared/components/ui/Toast/MiToast';
import Button from '../../../../shared/components/ui/Button/Button';
import { FiSearch, FiRefreshCw, FiPlus, FiEye, FiSlash, FiX } from "react-icons/fi";
import { MdAccessTime, MdCalendarToday } from "react-icons/md";

// Utiles de fecha
const isoToDMY = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};
const ensureYMD = (raw) => {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [mm, dd, yyyy] = raw.split('/');
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [dd, mm, yyyy] = raw.split('-');
    return `${yyyy}-${mm}-${dd}`;
  }
  return raw;
};

export default function GestionReservas() {
  const navigate = useNavigate(); // Hook para navegar
  const [fechaISO, setFechaISO] = useState('');
  const [cancha, setCancha] = useState('');
  const [usuario, setUsuario] = useState('');

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const [detalle, setDetalle] = useState(null);

  const fetchData = async (goToPage = page) => {
    try {
      const fechaDMY = fechaISO ? isoToDMY(ensureYMD(fechaISO)) : undefined;
      const resp = await adminApi.reservas.adminSearch({
        fecha: fechaDMY,
        cancha: cancha.trim() || undefined,
        usuario: usuario.trim() || undefined,
        page: goToPage,
        limit
      });
      setRows(resp?.reservas || []);
      setTotal(resp?.total || (resp?.reservas?.length ?? 0));
      setPage(resp?.page || goToPage);
    } catch (e) {
      toast(<MiToast mensaje={e.message || 'Error cargando reservas'} color="#ef4444" />);
    }
  };

  useEffect(() => { fetchData(1); }, []);

  const onBuscar = async (e) => { e?.preventDefault(); await fetchData(1); };
  const onLimpiar = async () => { setFechaISO(''); setCancha(''); setUsuario(''); await fetchData(1); };

  const abrirDetalle = async (r) => {
    try {
      const data = await backendClient.get('reservas/detalle', {
        cancha: r.cancha_nombre || r.cancha,
        horario: r.horario,
        fecha: r.fecha,
      });
      setDetalle(data);
    } catch (e) {
      toast(<MiToast mensaje={e.message || 'Error cargando detalle'} color="#ef4444" />);
    }
  };

  const cancelarReserva = async (r) => {
    if (!window.confirm('¿Cancelar esta reserva? Se notificará a los usuarios.')) return;
    try {
      await adminApi.reservas.cancelarReserva(r._id || r.id);
      toast(<MiToast mensaje="Reserva cancelada" color="#10b981" />);
      await fetchData(page);
      setDetalle(null);
    } catch (e) {
      toast(<MiToast mensaje={e.message || 'No se pudo cancelar'} color="#ef4444" />);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER UNIFICADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Reservas</h2>
          <p className="text-sm text-gray-400 mt-1">Agenda de turnos y control</p>
        </div>
        <div>
          <Button 
            type="button" 
            onClick={() => navigate("/panel-control/reservas/nueva")} // Redirige a la página nueva
            texto="Nueva Reserva" 
            variant="default" 
            size="md"
            icon={<FiPlus className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* FILTROS */}
      <form onSubmit={onBuscar} className="flex flex-col xl:flex-row gap-3">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                    type="date"
                    value={fechaISO}
                    onChange={(e) => setFechaISO(e.target.value)}
                    className="bg-slate-900/50 text-white text-sm border border-slate-700 rounded-lg px-4 py-2.5 focus:border-yellow-400 outline-none transition-colors"
                />
                <input
                    type="text"
                    value={cancha}
                    onChange={(e) => setCancha(e.target.value)}
                    placeholder="Filtrar por cancha..."
                    className="bg-slate-900/50 text-white text-sm border border-slate-700 rounded-lg px-4 py-2.5 focus:border-yellow-400 outline-none transition-colors placeholder:text-gray-500"
                />
                <input
                    type="text"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Buscar por usuario..."
                    className="bg-slate-900/50 text-white text-sm border border-slate-700 rounded-lg px-4 py-2.5 focus:border-yellow-400 outline-none transition-colors placeholder:text-gray-500"
                />
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <Button type="submit" texto="Filtrar" variant="secondary" size="md" className="w-full md:w-auto" icon={<FiSearch />} />
                <button 
                  type="button" 
                  onClick={onLimpiar}
                  className="p-2.5 text-gray-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                  title="Limpiar filtros"
                >
                  <FiRefreshCw size={20} />
                </button>
            </div>
      </form>

      {/* TABLA */}
      <div className="bg-slate-900/60 border border-slate-700/70 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-slate-600/50">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <table className="min-w-full text-sm text-gray-200">
            <thead className="bg-slate-800/90 text-xs uppercase text-gray-400 font-semibold tracking-wider border-b border-slate-700/70">
              <tr>
                <th className="px-6 py-3 text-left">Fecha</th>
                <th className="px-6 py-3 text-left">Hora</th>
                <th className="px-6 py-3 text-left">Cancha</th>
                <th className="px-6 py-3 text-left">Usuarios</th>
                <th className="px-6 py-3 text-center">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 bg-transparent">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                     <div className="flex flex-col items-center gap-2">
                        <MdCalendarToday size={24} className="text-gray-600"/>
                        <span>No hay reservas que coincidan.</span>
                     </div>
                  </td>
                </tr>
              ) : (
                rows.map(r => {
                  const deshabilitarCancelar = r.estado_nombre === 'Confirmada' || r.estado_nombre === 'Cancelada';
                  let statusClass = "bg-slate-700 text-slate-300 border-slate-600";
                  if (r.estado_nombre === 'Confirmada') statusClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
                  if (r.estado_nombre === 'Cancelada') statusClass = "bg-rose-500/10 text-rose-400 border-rose-500/25";

                  return (
                    <tr key={r._id || r.id} className="hover:bg-slate-800/40 transition-colors group relative cursor-default">
                      <td className="px-6 py-4 align-middle font-medium text-white">{r.fecha}</td>
                      <td className="px-6 py-4 align-middle text-gray-300">
                        <div className="flex items-center gap-1"><MdAccessTime className="text-slate-500" />{r.hora_inicio || r.horario}</div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className="px-2 py-1 bg-slate-800 rounded text-xs text-gray-300 border border-slate-700">{r.cancha_nombre || r.cancha}</span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex flex-wrap items-center gap-1 max-w-[250px]">
                            {(r.usuarios || []).slice(0, 3).map((u, i) => (
                                <span key={i} className="inline-block px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-gray-300 border border-slate-700 truncate max-w-[100px]" title={u.nombre + ' ' + u.apellido}>
                                    {u.nombre}
                                </span>
                            ))}
                            {(r.usuarios || []).length > 3 && (
                                <span className="text-[10px] text-gray-500">+{r.usuarios.length - 3}</span>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusClass}`}>{r.estado_nombre || 'Pendiente'}</span>
                      </td>
                      <td className="px-6 py-4 align-middle text-right">
                         <div className="flex items-center justify-end gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200">
                            <button onClick={() => abrirDetalle(r)} className="p-2 text-slate-400 hover:text-blue-400 rounded-lg transition-all"><FiEye size={18} /></button>
                            {!deshabilitarCancelar && (
                                <button onClick={() => cancelarReserva(r)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg transition-all"><FiSlash size={18} /></button>
                            )}
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
            <Paginacion currentPage={page} totalPages={totalPages} onPageChange={(p) => fetchData(p)} loading={false} />
        </div>
      )}

      {detalle && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setDetalle(null)}><FiX size={20} /></button>
            <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Detalle de Reserva</h3>
            <div className="space-y-3 text-sm">
               <div className="flex justify-between"><span className="text-gray-400">Cancha:</span> <span className="text-white">{detalle?.cancha}</span></div>
               <div className="flex justify-between"><span className="text-gray-400">Fecha:</span> <span className="text-white">{detalle?.fecha}</span></div>
               <div className="flex justify-between"><span className="text-gray-400">Horario:</span> <span className="text-white">{detalle?.horario}</span></div>
               <div className="pt-2">
                 <span className="block text-gray-400 mb-2">Usuarios en el turno:</span>
                 <ul className="grid grid-cols-2 gap-2">
                    {detalle?.usuarios?.map((u, idx) => (
                        <li key={idx} className="bg-gray-800 rounded px-2 py-1 text-gray-200 text-xs border border-gray-700 truncate">{u.nombre} {u.apellido}</li>
                    ))}
                 </ul>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}