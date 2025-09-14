import { useState, useContext, useEffect } from 'react'
import { AuthContext } from "../../context/AuthContext";
import { toast } from 'react-toastify';
import MiToast from '../common/Toast/MiToast';
import CourtCarousel from '../reservas/CourtCarousel';

// ===== Helpers simples =====
const MAX_CAPACITY = 6;

export const generarHorarios = () => {
  const out = [];
  let h = 9, m = 0;
  while (h < 23) {
    const iH = String(h).padStart(2, '0');
    const iM = String(m).padStart(2, '0');
    let fh = h + 1, fm = m + 30;
    if (fm >= 60) { fm -= 60; fh += 1; }
    if (fh >= 24) break;
    out.push(`${iH}:${iM}-${String(fh).padStart(2,'0')}:${String(fm).padStart(2,'0')}`);
    m += 30; if (m >= 60) { m = 0; h += 1; } h += 1;
  }
  return out;
};
const HORARIOS = generarHorarios();

const generarFechas = () => {
  const r = [], hoy = new Date();
  const opt = { weekday: 'long', day: 'numeric', month: 'long' };
  for (let i = 0; i < 7; i++) {
    const f = new Date(hoy); f.setDate(hoy.getDate() + i);
    r.push({
      display: new Intl.DateTimeFormat('es-ES', opt).format(f).replace(/^\w/, c => c.toUpperCase()),
      value: `${String(f.getDate()).padStart(2,'0')}-${String(f.getMonth()+1).padStart(2,'0')}-${f.getFullYear()}`
    });
  }
  return r;
};
const FECHAS = generarFechas();

const normalizarTexto = (t) => t.trim().replace(/\s+/g, ' ');

// ===== Componente minimal =====
export default function ReservaTabla() {
  const { isAuthenticated, apiFetch, user } = useContext(AuthContext);

  const [canchas, setCanchas] = useState([]);
  const [cantidades, setCantidades] = useState({});
  const [selectedDate, setSelectedDate] = useState(FECHAS[0].value);
  const [selected, setSelected] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [detalleReserva, setDetalleReserva] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Cargar canchas 1 vez
  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch('/api/canchas/listar');
        if (r.ok) {
          const data = await r.json();
          setCanchas(data.map(c => c.nombre));
        }
      } catch {}
    })();
  }, [apiFetch]);

  // Cargar conteos por fecha
  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch(`/api/reservas/cantidad?fecha=${selectedDate}`);
        if (!r.ok) return setCantidades({});
        const data = await r.json();
        const mapa = {};
        for (const it of data) mapa[`${it.cancha}-${it.horario}`] = it.cantidad;
        setCantidades(mapa);
      } catch { setCantidades({}); }
    })();
  }, [selectedDate, apiFetch]);

  const isPastSlot = (hora) => {
    if (selectedDate !== FECHAS[0].value) return false;
    const [h, m] = hora.split('-')[0].split(':').map(Number);
    const t = new Date(); t.setHours(h, m, 0, 0);
    return (t.getTime() - Date.now()) < 3600000;
  };

  const abrirDetalle = async (cancha, hora) => {
    setLoadingDetalle(true);
    setModalOpen(true);
    try {
      const url = `/api/reservas/detalle?cancha=${encodeURIComponent(normalizarTexto(cancha))}&horario=${encodeURIComponent(normalizarTexto(hora))}&fecha=${encodeURIComponent(selectedDate)}${user?.id ? `&usuario_id=${user.id}` : ''}`;
      const r = await apiFetch(url);
      setDetalleReserva(r.ok ? await r.json() : null);
    } catch { setDetalleReserva(null); }
    setLoadingDetalle(false);
  };

  const reservar = async (cancha, hora) => {
    if (!window.confirm(`¿Confirmás reservar "${cancha}" a las ${hora} para el ${selectedDate}?`)) return;
    setSelected({ cancha, hora });
    try {
      const r = await apiFetch('/api/reservas/reservar', {
        method: 'POST',
        body: JSON.stringify({ cancha, horario: hora, fecha: selectedDate })
      });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error al reservar');
      const data = await r.json();
      toast(<MiToast mensaje={`Reserva exitosa: ${data.msg}`} color="var(--color-green-400)" />);
      const key = `${cancha}-${hora}`;
      setCantidades(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
    } catch (e) {
      toast(<MiToast mensaje={`Error: ${e.message}`} color="var(--color-red-400)" />);
      setSelected(null);
    }
  };

  const cancelar = async (reservaId) => {
    try {
      const r = await apiFetch(`/api/reservas/cancelar/${reservaId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error al cancelar');
      toast(<MiToast mensaje="Reserva cancelada" color="var(--color-red-400)" />);
      setModalOpen(false);
    } catch (e) {
      toast(<MiToast mensaje={e.message} color="var(--color-red-400)" />);
    }
  };

  return (
    <div className="min-h-[80vh] w-full pt-10 pb-16">
      <div className="mx-auto max-w-5xl px-4">
        {/* Selector de fecha centrado */}
        <div className="mt-4 flex justify-center">
          <select
            aria-label="Seleccionar fecha"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setSelected(null); }}
            className="w-full max-w-sm bg-[#0F1524] border border-white/10 text-white text-sm rounded-lg px-3 py-2
                       focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/50"
          >
            {FECHAS.map(f => <option key={f.value} value={f.value}>{f.display}</option>)}
          </select>
        </div>

        {/* Carousel */}
        <CourtCarousel
          canchas={canchas}
          horarios={HORARIOS}
          cantidades={cantidades}
          isAuthenticated={isAuthenticated}
          selected={selected}
          onOpenDetail={abrirDetalle}
          isPastSlot={isPastSlot}
          capacity={MAX_CAPACITY}
        />

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
            <div className="relative w-full max-w-md rounded-2xl p-6 bg-white/5 backdrop-blur-sm border border-white/10">
              <button className="absolute top-3 right-3 text-slate-300 hover:text-white" onClick={() => setModalOpen(false)} aria-label="Cerrar">✕</button>

              {loadingDetalle ? (
                <div className="space-y-4">
                  <div className="h-6 w-1/2 bg-white/10 rounded animate-pulse" />
                  <div className="h-24 w-full bg-white/10 rounded animate-pulse" />
                </div>
              ) : !detalleReserva ? (
                <div className="text-center text-rose-300">No se pudo cargar el detalle</div>
              ) : (
                <div>
                  <h3 className="text-lg font-bold text-white"><span className="text-amber-400">Detalle</span> de Reserva</h3>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-slate-400">Cancha</div>
                      <div className="text-white font-semibold">{detalleReserva.cancha}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-slate-400">Fecha</div>
                      <div className="text-white font-semibold">{detalleReserva.fecha}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 sm:col-span-2">
                      <div className="text-slate-400">Horario</div>
                      <div className="text-white font-semibold">{detalleReserva.horario}</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-slate-200 font-semibold">Reservaron</div>
                    <ul className="mt-1 space-y-1 max-h-40 overflow-auto pr-1">
                      {detalleReserva.usuarios.length === 0
                        ? <li className="text-slate-400">Nadie aún</li>
                        : detalleReserva.usuarios
                            .filter(u => u.estado !== detalleReserva.estado_cancelada)
                            .map((u, i) => <li key={i} className="text-slate-300">{u.nombre} {u.apellido}</li>)
                      }
                    </ul>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {(() => {
                      const key = `${detalleReserva.cancha}-${detalleReserva.horario}`;
                      const count = (cantidades[key] ??
                        detalleReserva.usuarios.filter(u => u.estado !== detalleReserva.estado_cancelada).length) || 0;
                      const full = count >= MAX_CAPACITY;
                      const yo = detalleReserva.usuarios.find(u => u.usuario_id === user?.id);
                      const cancelada = yo?.estado === detalleReserva.estado_cancelada;

                      if (yo && !cancelada) {
                        return (
                          <button
                            className="px-4 py-2 rounded-lg bg-rose-500 text-white font-semibold hover:bg-rose-600"
                            onClick={() => cancelar(yo.reserva_id)}
                          >Cancelar reserva</button>
                        );
                      }
                      if (!full && isAuthenticated && (!yo || cancelada)) {
                        return (
                          <button
                            className="px-4 py-2 rounded-lg bg-amber-400 text-[#0B1220] font-bold hover:bg-amber-300"
                            onClick={() => { setModalOpen(false); reservar(detalleReserva.cancha, detalleReserva.horario); }}
                          >Reservar</button>
                        );
                      }
                      return <span className="text-sm text-slate-400">{full ? 'Turno lleno.' : !isAuthenticated ? 'Inicia sesión para reservar.' : ''}</span>;
                    })()}
                    <button className="px-4 py-2 rounded-lg font-semibold border bg-white/5 border-white/10" onClick={() => setModalOpen(false)}>Cerrar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
