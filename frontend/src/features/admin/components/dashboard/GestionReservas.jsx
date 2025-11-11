import { useEffect, useMemo, useState } from 'react';
import adminApi from '../../../../shared/services/adminApi';
import backendClient from '../../../../shared/services/backendClient';
import Paginacion from '../../../../shared/components/ui/Paginacion';
import { toast } from 'react-toastify';
import MiToast from '../../../../shared/components/ui/Toast/MiToast';
import Button from '../../../../shared/components/ui/Button/Button';

const toDMY = (yyyy_mm_dd) => {
  if (!yyyy_mm_dd) return '';
  const [y, m, d] = yyyy_mm_dd.split('-');
  return `${d}-${m}-${y}`;
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

  const fetchData = async (goToPage = page) => {
    try {
      const fechaDMY = fechaISO ? toDMY(fechaISO) : undefined;
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
    </div>
  );
}