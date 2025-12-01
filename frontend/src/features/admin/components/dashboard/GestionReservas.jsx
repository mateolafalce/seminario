import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import adminApi from "../../../../shared/services/adminApi";
import backendClient from "../../../../shared/services/backendClient";
import Paginacion from "../../../../shared/components/ui/Paginacion";
import { toast } from "react-toastify";
import MiToast from "../../../../shared/components/ui/Toast/MiToast";
import Button from "../../../../shared/components/ui/Button/Button";
import {
  FiSearch,
  FiRefreshCw,
  FiPlus,
  FiEye,
  FiSlash,
  FiX,
} from "react-icons/fi";
import {
  MdAccessTime,
  MdCalendarToday,
  MdOutlineBookmarkAdded,
  MdWarning,
} from "react-icons/md";
import useReservasAdmin from "../../../reservas/hooks/useReservasAdmin";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { y: 10, opacity: 0, filter: "blur(2px)" },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
};

export default function GestionReservas() {
  const navigate = useNavigate();

  // 👉 Hook centralizado de reservas (backend paginado)
  const {
    fechaISO,
    setFechaISO,
    cancha,
    setCancha,
    usuario,
    setUsuario,
    rows,
    page,
    totalPages,
    fetchData,
    onBuscar,
    onLimpiar,
    loading,
  } = useReservasAdmin();

  const [detalle, setDetalle] = useState(null);
  const [reservaACancelar, setReservaACancelar] = useState(null);

  // Diccionario de nombres para arreglar IDs de canchas
  const [nombresCanchas, setNombresCanchas] = useState({});

  useEffect(() => {
    const cargarNombres = async () => {
      try {
        const data = await backendClient.get("canchas/listar");
        const lista = Array.isArray(data) ? data : data.canchas || [];
        const mapa = {};
        lista.forEach((c) => {
          const id = c.id || c._id;
          if (id) mapa[id] = c.nombre;
        });
        setNombresCanchas(mapa);
      } catch (error) {
        console.error(error);
      }
    };
    cargarNombres();
  }, []);

  const abrirDetalle = async (r) => {
    try {
      const nombreCanchaReal =
        nombresCanchas[r.cancha] || r.cancha_nombre || r.cancha;
      const data = await backendClient.get("reservas/detalle", {
        cancha: nombreCanchaReal,
        horario: r.horario,
        fecha: r.fecha,
      });
      setDetalle(data);
    } catch (e) {
      let msg = e.message || "Error cargando detalle";
      const data = e?.response?.data;
      const detail = data?.detail;
      const message = data?.message;

      if (detail) {
        if (typeof detail === "string") msg = detail;
        else if (Array.isArray(detail)) msg = detail.map((x) => x.msg || JSON.stringify(x)).join(", ");
        else if (typeof detail === "object") msg = JSON.stringify(detail);
      } else if (message) {
        msg = typeof message === "string" ? message : JSON.stringify(message);
      } else if (typeof data === "string") {
        msg = data;
      }

      toast(
        <MiToast
          mensaje={msg}
          color="#ef4444"
        />
      );
    }
  };

  const handleCancelar = (r) => {
    setReservaACancelar(r);
  };

  const confirmarCancelacion = async () => {
    if (!reservaACancelar) return;
    try {
      await adminApi.reservas.cancelarReserva(reservaACancelar._id || reservaACancelar.id);
      toast(<MiToast mensaje="Reserva cancelada" color="#10b981" />);
      await fetchData(page);
      setDetalle(null);
      setReservaACancelar(null);
    } catch (e) {
      let msg = e.message || "No se pudo cancelar";
      const data = e?.response?.data;
      const detail = data?.detail;
      const message = data?.message;

      if (detail) {
        if (typeof detail === "string") msg = detail;
        else if (Array.isArray(detail)) msg = detail.map((x) => x.msg || JSON.stringify(x)).join(", ");
        else if (typeof detail === "object") msg = JSON.stringify(detail);
      } else if (message) {
        msg = typeof message === "string" ? message : JSON.stringify(message);
      } else if (typeof data === "string") {
        msg = data;
      }

      toast(
        <MiToast
          mensaje={msg}
          color="#ef4444"
        />
      );
    }
  };

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ITEM 1: HEADER */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5"
      >
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span className="text-yellow-400">
              <MdOutlineBookmarkAdded />
            </span>
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
      </motion.div>

      {/* ITEM 2: FILTROS */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900/40 border border-slate-800 rounded-xl p-4"
      >
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
            <Button
              type="submit"
              texto="Buscar"
              variant="secondary"
              className="w-full md:w-auto"
              icon={<FiSearch />}
              disabled={loading}
            />
            <button
              type="button"
              onClick={onLimpiar}
              className="p-2.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
              title="Limpiar filtros"
              disabled={loading}
            >
              <FiRefreshCw size={20} />
            </button>
          </div>
        </form>
      </motion.div>

      {/* ITEM 3: TABLA */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm"
      >
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
              {rows.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center text-slate-500"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <MdCalendarToday size={32} className="text-slate-700" />
                      <span>
                        No hay reservas que coincidan con la búsqueda.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const deshabilitarCancelar =
                    r.estado_nombre === "Confirmada" ||
                    r.estado_nombre === "Cancelada";

                  let statusClass =
                    "bg-slate-800 text-slate-400 border-slate-700";
                  let dotClass = "bg-slate-500";

                  if (r.estado_nombre === "Confirmada") {
                    statusClass =
                      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                    dotClass = "bg-emerald-400";
                  }
                  if (r.estado_nombre === "Cancelada") {
                    statusClass =
                      "bg-red-500/10 text-red-400 border-red-500/20";
                    dotClass = "bg-red-400";
                  }

                  const nombreCanchaVisual =
                    nombresCanchas[r.cancha] ||
                    r.cancha_nombre ||
                    r.cancha;

                  return (
                    <tr
                      key={r._id || r.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="px-6 py-4 font-medium text-slate-200">
                        {r.fecha}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        <div className="flex items-center gap-2">
                          <MdAccessTime className="text-slate-500" />
                          {r.horario || r.hora_inicio}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300">
                          {nombreCanchaVisual}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                          {(r.usuarios || [])
                            .slice(0, 2)
                            .map((u, i) => (
                              <span
                                key={i}
                                className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700 truncate max-w-[90px]"
                              >
                                {u.nombre}
                              </span>
                            ))}
                          {(r.usuarios || []).length > 2 && (
                            <span className="text-[10px] text-slate-500">
                              +{r.usuarios.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${dotClass}`}
                          ></span>
                          {r.estado_nombre || "Pendiente"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-60 lg:group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => abrirDetalle(r)}
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                            title="Ver detalle"
                          >
                            <FiEye size={18} />
                          </button>
                          {!deshabilitarCancelar && (
                            <button
                              onClick={() => handleCancelar(r)}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                              title="Cancelar reserva"
                            >
                              <FiSlash size={18} />
                            </button>
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
      </motion.div>

      {/* PAGINACIÓN (tu componente, con backend paginado) */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Paginacion
            currentPage={page}
            totalPages={totalPages}
            onPageChange={fetchData}
            loading={loading}
          />
        </div>
      )}

      {/* MODAL DETALLE */}
      {detalle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md relative shadow-2xl">
            <button
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              onClick={() => setDetalle(null)}
            >
              <FiX size={20} />
            </button>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <MdCalendarToday className="text-yellow-400" /> Detalle de
              Reserva
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-sm">Cancha</span>
                <span className="text-white font-medium text-sm">
                  {detalle?.cancha}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                  <span className="block text-slate-400 text-xs mb-1">
                    Fecha
                  </span>
                  <span className="text-white font-medium text-sm">
                    {detalle?.fecha}
                  </span>
                </div>
                <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                  <span className="block text-slate-400 text-xs mb-1">
                    Horario
                  </span>
                  <span className="text-white font-medium text-sm">
                    {detalle?.horario}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <span className="block text-slate-400 text-xs uppercase font-semibold mb-3 tracking-wider">
                  Jugadores
                </span>
                <ul className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                  {detalle?.usuarios?.map((u, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50"
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-bold">
                        {u.nombre.charAt(0)}
                      </div>
                      <span className="text-slate-200 text-sm">
                        {u.nombre} {u.apellido}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6">
              <Button
                texto="Cerrar"
                onClick={() => setDetalle(null)}
                variant="secondary"
                className="w-full justify-center"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE CANCELACIÓN */}
      <AnimatePresence>
        {reservaACancelar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setReservaACancelar(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                  <MdWarning size={28} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">¿Cancelar reserva?</h3>
                <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                  Estás a punto de cancelar la reserva del <strong className="text-white">{reservaACancelar.fecha}</strong> a las <strong className="text-white">{reservaACancelar.horario || reservaACancelar.hora_inicio}</strong>.
                  <br/>Se notificará a los usuarios involucrados.
                </p>
                
                <div className="flex gap-3 w-full">
                  <Button 
                    texto="Volver" 
                    onClick={() => setReservaACancelar(null)}
                    variant="secondary"
                    className="flex-1 justify-center"
                  />
                  <Button 
                    texto="Sí, cancelar" 
                    onClick={confirmarCancelacion}
                    className="flex-1 justify-center bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20 border-transparent"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
