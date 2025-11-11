import { useEffect, useMemo, useState } from 'react';
import adminApi from '../../../../shared/services/adminApi';
import backendClient from '../../../../shared/services/backendClient';
import Paginacion from '../../../../shared/components/ui/Paginacion';
import { toast } from 'react-toastify';
import MiToast from '../../../../shared/components/ui/Toast/MiToast';
import Button from '../../../../shared/components/ui/Button/Button';
import { listarCanchas, listarHorarios, buscarUsuariosAdmin } from '../../../../shared/services/adminApi';

// Convierte Date -> 'YYYY-MM-DD' (para <input type="date">)
const dateToYMD = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : "");

// Convierte 'YYYY-MM-DD' del input -> Date
const inputToDate = (val) => {
  if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return null;
  const [y, m, d] = val.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d));
};

// Date -> 'DD-MM-YYYY' (para el backend)
const dateToDMY = (d) => {
  if (!(d instanceof Date)) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// Hoy en 'YYYY-MM-DD' para min del input
const todayYMD = () => {
  const t = new Date();
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${mm}-${dd}`;
};

// YYYY-MM-DD -> DD-MM-YYYY (para filtro de búsqueda)
const isoToDMY = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};

// Normaliza entrada a YYYY-MM-DD (para filtro de búsqueda)
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
  // filtros - fecha empieza vacía para mostrar últimas 10
  const [fechaISO, setFechaISO] = useState('');
  const [cancha, setCancha] = useState('');
  const [usuario, setUsuario] = useState('');

  // datos
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  // modal detalle
  const [detalle, setDetalle] = useState(null);

  // Estado para crear reserva
  const [openCrear, setOpenCrear] = useState(false);
  const [form, setForm] = useState({
    fecha: null,          // Date object, not string
    cancha_id: '',
    horario_id: '',
    usuarios: []
  });
  const [canchas, setCanchas] = useState([]);
  const [horarios, setHorarios] = useState([]);
  
  // User search state
  const [userQuery, setUserQuery] = useState('');
  const [userSugs, setUserSugs] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

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

  // primera carga
  useEffect(() => { fetchData(1); /* eslint-disable-next-line */ }, []);

  const onBuscar = async (e) => {
    e?.preventDefault();
    await fetchData(1);
  };

  const onLimpiar = async () => {
    setFechaISO('');
    setCancha('');
    setUsuario('');
    await fetchData(1);
  };

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
      toast(<MiToast mensaje="Reserva cancelada y usuarios notificados" color="#10b981" />);
      await fetchData(page); // 👈 refrescar grilla
      setDetalle(null);
    } catch (e) {
      toast(<MiToast mensaje={e.message || 'No se pudo cancelar'} color="#ef4444" />);
    }
  };

  // Cargar canchas y horarios al abrir el modal
  useEffect(() => {
    if (!openCrear) return;
    (async () => {
      try {
        const [cs, hs] = await Promise.all([listarCanchas(), listarHorarios()]);
        setCanchas(cs);
        setHorarios(hs);
      } catch (e) {
        toast(<MiToast mensaje={e.message || 'No se pudieron cargar canchas/horarios'} color="#ef4444" />);
      }
    })();
  }, [openCrear]);

  // User search with debounce
  useEffect(() => {
    const t = setTimeout(async () => {
      if (userQuery.trim().length < 1) { 
        setUserSugs([]); 
        return; 
      }
      const sugs = await buscarUsuariosAdmin(userQuery);
      const selectedIds = new Set(selectedUsers.map(s => s.id));
      setUserSugs(sugs.filter(s => !selectedIds.has(s.id)).slice(0, 8));
    }, 250);
    return () => clearTimeout(t);
  }, [userQuery, selectedUsers]);

  // Crear una nueva reserva
  const crearReserva = async () => {
    try {
      if (!(form.fecha instanceof Date)) {
        toast(<MiToast mensaje="Elegí una fecha válida con el calendario" color="#ef4444" />);
        return;
      }
      if (!form.cancha_id || !form.horario_id) {
        toast(<MiToast mensaje="Seleccioná cancha y horario" color="#ef4444" />);
        return;
      }

      const payload = {
        fecha: form.fecha,        // Pass Date object directly - adminApi will convert it
        cancha_id: form.cancha_id,
        horario_id: form.horario_id,
        usuarios: selectedUsers.map((u) => u.id),
      };

      await adminApi.reservas.crearReservaAdmin(payload);

      toast(<MiToast mensaje="Reserva creada y usuarios notificados" color="#10b981" />);
      setOpenCrear(false);
      setForm({ fecha: null, cancha_id: '', horario_id: '', usuarios: [] });
      setSelectedUsers([]);
      setUserQuery('');
      await fetchData(page);
    } catch (e) {
      toast(<MiToast mensaje={e?.message || "No se pudo crear la reserva"} color="#ef4444" />);
    }
  };

  return (
    <div className="min-h-[60vh] w-full py-4">
      <h2 className="text-xl font-bold text-white mb-4">Gestión de Reservas</h2>

      {/* Filtros */}
      <form onSubmit={onBuscar} className="grid grid-cols-1 md:grid-cols-[210px_1fr_1fr_auto] gap-3 bg-gray-800/60 p-4 rounded-xl border border-gray-700">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Fecha</label>
          <input
            type="date"
            value={fechaISO}
            onChange={(e) => setFechaISO(e.target.value)}
            className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Cancha</label>
          <input
            type="text"
            value={cancha}
            onChange={(e) => setCancha(e.target.value)}
            placeholder="Ej: Cancha 1"
            className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Usuario</label>
          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="username / nombre / apellido"
            className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" texto="Buscar" variant="primary" size="md" />
          <Button type="button" onClick={onLimpiar} texto="Limpiar" variant="secondary" size="md" />
          <Button 
            type="button" 
            onClick={() => setOpenCrear(true)} 
            texto="Nueva reserva" 
            variant="primary" 
            size="md"
            className="ml-2"
          />
        </div>
      </form>

      {/* Tabla */}
      <div className="mt-4 bg-gray-800/60 rounded-xl border border-gray-700 overflow-hidden">
        <div className="grid grid-cols-[110px_110px_1fr_1.5fr_100px_auto] gap-0 px-4 py-2 text-xs font-semibold text-gray-300 border-b border-gray-700">
          <div>Fecha</div>
          <div>Hora</div>
          <div>Cancha</div>
          <div>Usuarios</div>
          <div>Estado</div>
          <div className="text-right pr-1">Acciones</div>
        </div>

        {rows.length === 0 ? (
          <div className="p-6 text-gray-400">Sin resultados</div>
        ) : (
          rows.map(r => {
            // Calcular si el botón debe estar deshabilitado
            const deshabilitarCancelar = r.estado_nombre === 'Confirmada' || r.estado_nombre === 'Cancelada';

            // Badge color según estado
            const badgeClass =
              r.estado_nombre === 'Confirmada'
                ? 'bg-green-600/20 text-green-300'
                : r.estado_nombre === 'Cancelada'
                ? 'bg-red-600/20 text-red-300'
                : 'bg-yellow-600/20 text-yellow-300';

            return (
              <div key={r._id || r.id}
                className="grid grid-cols-[110px_110px_1fr_1.5fr_100px_auto] items-center gap-0 px-4 py-3 border-b border-gray-700 text-sm text-gray-100">
                <div>{r.fecha}</div>
                <div>{r.hora_inicio || r.horario}</div>
                <div className="truncate">{r.cancha_nombre || r.cancha}</div>
                <div className="text-gray-200">
                  <div className="flex flex-wrap items-center gap-1 max-w-full">
                    {(() => {
                      const list = (r.usuarios || []).map(u => {
                        const full = `${(u.nombre||'').trim()} ${(u.apellido||'').trim()}`.trim();
                        return full || `@${u.username}`;
                      });
                      const shown = list.slice(0, 6);
                      const rest = list.length - shown.length;
                      return (
                        <>
                          {shown.map((name, i) => (
                            <span
                              key={i}
                              className="inline-block max-w-[160px] truncate px-2 py-0.5 rounded-full bg-gray-700 text-xs text-gray-100"
                              title={name}
                            >
                              {name}
                            </span>
                          ))}
                          {rest > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-gray-600 text-xs text-gray-100">
                              +{rest} más
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${badgeClass}`}>
                    {r.estado_nombre || 'Pendiente'}
                  </span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => abrirDetalle(r)}
                    className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs"
                  >
                    Ver
                  </button>
                  <button
                    disabled={deshabilitarCancelar}
                    onClick={() => !deshabilitarCancelar && cancelarReserva(r)}
                    className={[
                      'px-3 py-1 rounded text-xs font-medium transition-colors',
                      deshabilitarCancelar
                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-60'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    ].join(' ')}
                    title={
                      deshabilitarCancelar
                        ? (r.estado_nombre === 'Confirmada'
                            ? 'No se puede cancelar una reserva confirmada'
                            : 'Reserva ya cancelada')
                        : 'Cancelar reserva'
                    }
                  >
                    {deshabilitarCancelar 
                      ? (r.estado_nombre === 'Cancelada' ? 'Cancelada' : 'Confirmada') 
                      : 'Cancelar'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paginación */}
      <div className="mt-4">
        <Paginacion
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(p) => fetchData(p)}
          loading={false}
        />
      </div>

      {/* Modal detalle (reutilizado) */}
      {detalle && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white"
              onClick={() => setDetalle(null)}
            >✕</button>
            <h3 className="text-lg font-bold text-[#eaff00] mb-2 text-center">Detalle de Reserva</h3>
            <div className="mb-2 text-gray-200">
              <span className="font-semibold">Cancha:</span> {detalle?.cancha}<br />
              <span className="font-semibold">Fecha:</span> {detalle?.fecha}<br />
              <span className="font-semibold">Horario:</span> {detalle?.horario}
            </div>
            <div className="mb-2">
              <span className="font-semibold text-gray-200">Usuarios:</span>
              <ul className="mt-1">
                {detalle?.usuarios?.length
                  ? detalle.usuarios.map((u, idx) => (
                      <li key={idx} className="text-gray-300">
                        {u.nombre} {u.apellido}
                      </li>
                    ))
                  : <li className="text-gray-400">Nadie aún</li>
                }
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Reserva */}
      {openCrear && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl"
              onClick={() => setOpenCrear(false)}
            >×</button>
            
            <h3 className="text-lg font-bold text-[#eaff00] mb-4">Crear Reserva (Admin)</h3>
            
            <div className="space-y-4">
              {/* Fecha */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Fecha</label>
                <input
                  type="date"
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2"
                  value={dateToYMD(form.fecha)}
                  min={todayYMD()}
                  onChange={(e) => setForm((f) => ({ ...f, fecha: inputToDate(e.target.value) }))}
                  onClick={(e) => e.target.showPicker?.()}
                />
              </div>

              {/* Cancha */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Cancha</label>
                <select
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2"
                  value={form.cancha_id || ''}
                  onChange={e => setForm(f => ({ ...f, cancha_id: e.target.value }))}
                >
                  <option value="">Seleccioná una cancha</option>
                  {canchas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Horario */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Horario</label>
                <select
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2"
                  value={form.horario_id || ''}
                  onChange={e => setForm(f => ({ ...f, horario_id: e.target.value }))}
                >
                  <option value="">Seleccioná un horario</option>
                  {horarios.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.hora || `${h.inicio} – ${h.fin}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Usuarios */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Usuarios ({selectedUsers.length}/6)
                </label>

                <div className="relative">
                  {/* chips */}
                  {selectedUsers.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {selectedUsers.map(u => (
                        <span key={u.id} className="inline-flex items-center gap-2 bg-gray-700 text-gray-200 px-2 py-1 rounded">
                          <span className="max-w-[220px] truncate">{u.label}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedUsers(prev => prev.filter(x => x.id !== u.id))}
                            className="text-gray-400 hover:text-white"
                            aria-label="Quitar"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* input */}
                  <input
                    value={userQuery}
                    onChange={e => setUserQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && userSugs.length === 1 && selectedUsers.length < 6) {
                        setSelectedUsers(prev => [...prev, userSugs[0]]);
                        setUserQuery('');
                        setUserSugs([]);
                        e.preventDefault();
                      }
                    }}
                    placeholder="Buscar usuarios…"
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />

                  {/* dropdown */}
                  {userSugs.length > 0 && (
                    <ul className="absolute z-20 mt-1 w-full bg-gray-800 border border-gray-700 rounded shadow-lg max-h-56 overflow-auto">
                      {userSugs.map(s => (
                        <li
                          key={s.id}
                          className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-100"
                          onClick={() => {
                            if (selectedUsers.length < 6) {
                              setSelectedUsers(prev => [...prev, s]);
                              setUserQuery('');
                              setUserSugs([]);
                            }
                          }}
                        >
                          {s.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  onClick={() => setOpenCrear(false)}
                  texto="Cerrar"
                  variant="secondary"
                  size="md"
                />
                <Button
                  type="button"
                  onClick={crearReserva}
                  texto="Crear Reserva"
                  variant="primary"
                  size="md"
                  disabled={!form.fecha || !form.cancha_id || !form.horario_id || selectedUsers.length < 1}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}