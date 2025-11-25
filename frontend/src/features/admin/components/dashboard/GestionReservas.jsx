import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../../../shared/services/adminApi';
import backendClient from '../../../../shared/services/backendClient';
import Paginacion from '../../../../shared/components/ui/Paginacion';
import { toast } from 'react-toastify';
import MiToast from '../../../../shared/components/ui/Toast/MiToast';
import Button from '../../../../shared/components/ui/Button/Button';
import { FiSearch, FiRefreshCw, FiPlus, FiEye, FiSlash, FiX } from "react-icons/fi";
import { MdAccessTime, MdCalendarToday, MdOutlineBookmarkAdded } from "react-icons/md";

// Utiles de fecha (sin cambios)
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
  const navigate = useNavigate();
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
    // ANIMACIÓN AGREGADA AQUÍ: animate-in fade-in slide-in-from-bottom-4
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER LIMPIO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span className="text-yellow-400"><MdOutlineBookmarkAdded /></span>
            Reservas
          </h2>
          <p className="text-slate-400 mt-2 text-sm">
            Control de agenda, cancelaciones y detalles de turnos.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={() => navigate("/panel-control/reservas/resultados")}
            texto="Cargar resultados"
            variant="secondary"
          />
          <Button 
            type="button" 
            onClick={() => navigate("/panel-control/reservas/nueva")}
            texto="Nueva Reserva" 
            variant="default" 
            icon={<FiPlus className="w-5 h-5" />}
            className="shadow-lg shadow-yellow-400/10"
          />
        </div>
      </div>

      {/* FILTROS INTEGRADOS */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
        <form onSubmit={onBuscar} className="flex flex-col xl:flex-row gap-3">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                    type="date"
                    value={fechaISO}
                    onChange={(e) => setFechaISO(e.target.value)}
                    className="bg-slate-950 text-slate-200 text-sm border border-slate-700/80 rounded-lg px-4 py-2.5 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/50 outline-none transition-all placeholder:text-slate-600"
                />
                <input
                    type="text"
                    value={cancha}
                    onChange={(e) => setCancha(e.target.value)}
                    placeholder="Filtrar por cancha..."
                    className="bg-slate-950 text-slate-200 text-sm border border-slate-700/80 rounded-lg px-4 py-2.5 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/50 outline-none transition-all placeholder:text-slate-600"
                />
                <input
                    type="text"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Buscar por usuario..."
                    className="bg-slate-950 text-slate-200 text-sm border border-slate-700/80 rounded-lg px-4 py-2.5 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/50 outline-none transition-all placeholder:text-slate-600"
                />
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <Button type="submit" texto="Buscar" variant="secondary" className="w-full md:w-auto" icon={<FiSearch />} />
                <button 
                  type="button" 
                  onClick={onLimpiar}
                  className="p-2.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                  title="Limpiar filtros"
                >
                  <FiRefreshCw size={20} />
                </button>
            </div>
        </form>
      </div>

      {/* TABLA ESTILIZADA */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-950/50 text-xs uppercase text-slate-400 font-semibold tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Hora</th>
                <th className="px-6 py-4">Cancha</th>
                <th className="px-6 py-4">Usuarios</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 bg-transparent">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                     <div className="flex flex-col items-center gap-3">
                        <MdCalendarToday size={32} className="text-slate-700"/>
                        <span>No hay reservas que coincidan con la búsqueda.</span>
                     </div>
                  </td>
                </tr>
              ) : (
                rows.map(r => {
                  const deshabilitarCancelar = r.estado_nombre === 'Confirmada' || r.estado_nombre === 'Cancelada';
                  let statusClass = "bg-slate-800 text-slate-400 border-slate-700";
                  let dotClass = "bg-slate-500";
                  
                  if (r.estado_nombre === 'Confirmada') { statusClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"; dotClass="bg-emerald-400"; }
                  if (r.estado_nombre === 'Cancelada') { statusClass = "bg-red-500/10 text-red-400 border-red-500/20"; dotClass="bg-red-400"; }

                  return (
                    <tr key={r._id || r.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-200">{r.fecha}</td>
                      <td className="px-6 py-4 text-slate-300">
                        <div className="flex items-center gap-2"><MdAccessTime className="text-slate-500" />{r.hora_inicio || r.horario}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300">{r.cancha_nombre || r.cancha}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                            {(r.usuarios || []).slice(0, 2).map((u, i) => (
                                <span key={i} className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700 truncate max-w-[90px]">
                                    {u.nombre}
                                </span>
                            ))}
                            {(r.usuarios || []).length > 2 && (
                                <span className="text-[10px] text-slate-500">+{r.usuarios.length - 2}</span>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusClass}`}>
                           <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>
                           {r.estado_nombre || 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-60 lg:group-hover:opacity-100 transition-all">
                            <button onClick={() => abrirDetalle(r)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all" title="Ver detalle"><FiEye size={18} /></button>
                            {!deshabilitarCancelar && (
                                <button onClick={() => cancelarReserva(r)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="Cancelar reserva"><FiSlash size={18} /></button>
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

      {/* MODAL DETALLE (ESTILIZADO) */}
      {detalle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md relative shadow-2xl">
            <button className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors" onClick={() => setDetalle(null)}><FiX size={20} /></button>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <MdCalendarToday className="text-yellow-400"/> Detalle de Reserva
            </h3>
            
            <div className="space-y-4">
               <div className="flex justify-between p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-sm">Cancha</span> 
                    <span className="text-white font-medium text-sm">{detalle?.cancha}</span>
               </div>
               <div className="grid grid-cols-2 gap-4">
                   <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                        <span className="block text-slate-400 text-xs mb-1">Fecha</span>
                        <span className="text-white font-medium text-sm">{detalle?.fecha}</span>
                   </div>
                   <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                        <span className="block text-slate-400 text-xs mb-1">Horario</span>
                        <span className="text-white font-medium text-sm">{detalle?.horario}</span>
                   </div>
               </div>
               
               <div className="pt-2">
                 <span className="block text-slate-400 text-xs uppercase font-semibold mb-3 tracking-wider">Jugadores</span>
                 <ul className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                    {detalle?.usuarios?.map((u, idx) => (
                        <li key={idx} className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50">
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-bold">
                                {u.nombre.charAt(0)}
                            </div>
                            <span className="text-slate-200 text-sm">{u.nombre} {u.apellido}</span>
                        </li>
                    ))}
                 </ul>
               </div>
            </div>
            
            <div className="mt-6">
                <Button texto="Cerrar" onClick={() => setDetalle(null)} variant="secondary" className="w-full justify-center" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}