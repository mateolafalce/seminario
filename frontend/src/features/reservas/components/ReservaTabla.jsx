import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../auth/context/AuthContext";
import { toast } from "react-toastify";
import MiToast from "../../../shared/components/ui/Toast/MiToast";
import CourtCarousel from "./CourtCarousel";
import MessageConfirm from "../../../shared/components/ui/Confirm/MessageConfirm";
import backendClient from "../../../shared/services/backendClient";
import homeHeroPadel from "../../../assets/images/homeHeroPadel.jpg";

// ===== Helpers =====
const MAX_CAPACITY = 6;

const generarFechas = () => {
  const r = [],
    hoy = new Date();
  const opt = { weekday: "long", day: "numeric", month: "long" };
  for (let i = 0; i < 7; i++) {
    const f = new Date(hoy);
    f.setDate(hoy.getDate() + i);
    r.push({
      display: new Intl.DateTimeFormat("es-ES", opt)
        .format(f)
        .replace(/^\w/, (c) => c.toUpperCase()),
      value: `${String(f.getDate()).padStart(2, "0")}-${String(
        f.getMonth() + 1
      ).padStart(2, "0")}-${f.getFullYear()}`,
    });
  }
  return r;
};
const FECHAS = generarFechas();

const normalizarTexto = (t) => t.trim().replace(/\s+/g, " ");

// ===== Componente =====
export default function ReservaTabla() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [mensaje, setMensaje] = useState("");
  const [reservaPendiente, setReservaPendiente] = useState(null);

  const [canchas, setCanchas] = useState([]); // objetos completos
  const [canchasRaw, setCanchasRaw] = useState([]); // docs completos {id, nombre, horarios}
  const [horarios, setHorarios] = useState([]); // strings "HH:MM-HH:MM"
  const [horariosById, setHorariosById] = useState({}); // { [idHorario]: "HH:MM-HH:MM" }
  const [horariosPorCancha, setHorariosPorCancha] = useState({}); // { [nombreCancha]: string[] }

  const [cantidades, setCantidades] = useState({});
  const [selectedDate, setSelectedDate] = useState(FECHAS[0].value);
  const [selected, setSelected] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [detalleReserva, setDetalleReserva] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // 🔹 detalle de cancha (Ver cancha)
  const [canchaDetalle, setCanchaDetalle] = useState(null);
  const [showCanchaDetalle, setShowCanchaDetalle] = useState(false);

  // Cargar HORARIOS desde backend 1 sola vez
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await backendClient.get("horarios/listar");
        const arr = Array.isArray(data) ? data : [];
        if (!alive) return;

        const byId = {};
        const horas = [];

        arr.forEach((h) => {
          const id = h.id || h._id || h.hora;
          const hora = h.hora ?? (typeof h === "string" ? h : "");
          if (!hora || !id) return;
          byId[id] = hora;
          if (!horas.includes(hora)) horas.push(hora);
        });

        setHorarios(horas);
        setHorariosById(byId);
      } catch {
        if (alive) {
          setHorarios([]);
          setHorariosById({});
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Cargar canchas (1 vez)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await backendClient.get("canchas/listar");
        if (!alive) return;
        const arr = Array.isArray(data) ? data : [];
        setCanchasRaw(arr);
        // pasamos objetos completos al carrusel
        setCanchas(arr);
      } catch (e) {
        toast(
          <MiToast
            mensaje={e.message || "Error al cargar canchas"}
            color="var(--color-red-400)"
          />
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Construir mapa horariosPorCancha cuando tenemos canchasRaw + horariosById
  useEffect(() => {
    const map = {};
    canchasRaw.forEach((c) => {
      const ids = Array.isArray(c.horarios) ? c.horarios : [];
      map[c.nombre] = ids
        .map((id) => horariosById[id])
        .filter(Boolean);
    });
    setHorariosPorCancha(map);
  }, [canchasRaw, horariosById]);

  // Cargar conteos por fecha
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await backendClient.get("reservas/cantidad", {
          fecha: selectedDate,
        });
        if (!alive) return;
        const mapa = {};
        (data || []).forEach((it) => {
          mapa[`${it.cancha}-${it.horario}`] = it.cantidad;
        });
        setCantidades(mapa);
      } catch {
        if (alive) setCantidades({});
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedDate]);

  const isPastSlot = (hora) => {
    if (selectedDate !== FECHAS[0].value) return false;
    const [h, m] = hora.split("-")[0].split(":").map(Number);
    const t = new Date();
    t.setHours(h, m, 0, 0);
    return t.getTime() - Date.now() < 3600000;
  };

  const abrirDetalle = async (cancha, hora) => {
    setLoadingDetalle(true);
    setModalOpen(true);
    try {
      const data = await backendClient.get("reservas/detalle", {
        cancha: normalizarTexto(cancha),
        horario: normalizarTexto(hora),
        fecha: selectedDate,
        ...(user?.id ? { usuario_id: user.id } : {}),
      });
      setDetalleReserva(data ?? null);
    } catch {
      setDetalleReserva(null);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const reservar = (cancha, hora) => {
    setReservaPendiente({ cancha, hora });
    setMensaje(
      `¿Confirmás reservar "${cancha}" a las ${hora} para el ${selectedDate}?`
    );
  };

  const recargarCantidades = async () => {
    try {
      const data = await backendClient.get("reservas/cantidad", {
        fecha: selectedDate,
      });
      const mapa = {};
      (data || []).forEach((it) => {
        mapa[`${it.cancha}-${it.horario}`] = it.cantidad;
      });
      setCantidades(mapa);
    } catch {
      setCantidades({});
    }
  };

  const handleConfirmar = async () => {
    if (!reservaPendiente) return;
    const { cancha, hora } = reservaPendiente;
    setSelected({ cancha, hora });
    setReservaPendiente(null);
    setMensaje("");

    try {
      const data = await backendClient.post("reservas/reservar", {
        cancha,
        horario: hora,
        fecha: selectedDate,
      });
      toast(
        <MiToast
          mensaje={`Reserva exitosa: ${data?.msg || "OK"}`}
          color="var(--color-green-400)"
        />
      );
      await recargarCantidades();
    } catch (e) {
      toast(
        <MiToast
          mensaje={`Error: ${e.message}`}
          color="var(--color-red-400)"
        />
      );
      setSelected(null);
    }
  };

  const cancelar = async (reservaId) => {
    try {
      await backendClient.delete(`reservas/cancelar/${reservaId}`);
      toast(
        <MiToast
          mensaje="Reserva cancelada"
          color="var(--color-red-400)"
        />
      );
      setModalOpen(false);
      await recargarCantidades();
    } catch (e) {
      toast(
        <MiToast mensaje={e.message} color="var(--color-red-400)" />
      );
    }
  };

  const handleCancelar = () => {
    setReservaPendiente(null);
    setMensaje("");
  };

  // 🔹 VER CANCHA: navega a la página de detalle
  const handleViewCancha = (cancha) => {
    // Busco la cancha completa (con horarios, descripción, etc.)
    let canchaDet;
    if (typeof cancha === "string") {
      canchaDet = canchasRaw.find((c) => c.nombre === cancha);
    } else {
      canchaDet = cancha;
    }

    if (!canchaDet) {
      console.warn("No encontré la cancha para ver detalle:", cancha);
      return;
    }

    const canchaId = canchaDet.id || canchaDet._id;
    if (!canchaId) {
      console.warn("La cancha no tiene id", canchaDet);
      return;
    }

    // Navego a la nueva página y le paso todos los datos por state
    navigate(`/canchas/${canchaId}`, {
      state: { cancha: canchaDet },
    });
  };

  return (
    <div className="min-h-[80vh] w-full pt-10 pb-16">
      <div className="mx-auto max-w-5xl px-4">
        {/* Selector de fecha centrado */}
        <div className="mt-4 flex justify-center">
          <select
            aria-label="Seleccionar fecha"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelected(null);
            }}
            className="w-full max-w-sm bg-[#0F1524] border border-white/10 text-white text-sm rounded-lg px-3 py-2
                       focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/50"
          >
            {FECHAS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.display}
              </option>
            ))}
          </select>
        </div>

        {/* Carousel */}
        {canchas.length > 0 && (
          <CourtCarousel
            canchas={canchas}
            horarios={horarios}
            horariosByCancha={horariosPorCancha}
            cantidades={cantidades}
            isAuthenticated={!!user}
            selected={selected}
            onOpenDetail={abrirDetalle}
            onViewCancha={handleViewCancha}
            isPastSlot={isPastSlot}
            capacity={MAX_CAPACITY}
          />
        )}

        {/* MODAL Detalle de reserva */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <div className="relative w-full max-w-md rounded-2xl p-6 bg-white/5 backdrop-blur-sm border border-white/10">
              <button
                className="absolute top-3 right-3 text-slate-300 hover:text-white"
                onClick={() => setModalOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>

              {loadingDetalle ? (
                <div className="space-y-4">
                  <div className="h-6 w-1/2 bg-white/10 rounded animate-pulse" />
                  <div className="h-24 w-full bg-white/10 rounded animate-pulse" />
                </div>
              ) : !detalleReserva ? (
                <div className="text-center text-rose-300">
                  No se pudo cargar el detalle
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-bold text-white">
                    <span className="text-amber-400">Detalle</span> de
                    Reserva
                  </h3>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-slate-400">Cancha</div>
                      <div className="text-white font-semibold">
                        {detalleReserva.cancha}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-slate-400">Fecha</div>
                      <div className="text-white font-semibold">
                        {detalleReserva.fecha}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 sm:col-span-2">
                      <div className="text-slate-400">Horario</div>
                      <div className="text-white font-semibold">
                        {detalleReserva.horario}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-slate-200 font-semibold">
                      Reservaron
                    </div>
                    <ul className="mt-1 space-y-1 max-h-40 overflow-auto pr-1">
                      {detalleReserva.usuarios.length === 0 ? (
                        <li className="text-slate-400">Nadie aún</li>
                      ) : (
                        detalleReserva.usuarios
                          .filter(
                            (u) =>
                              u.estado !== detalleReserva.estado_cancelada
                          )
                          .map((u, i) => (
                            <li
                              key={i}
                              className="text-slate-300"
                            >{`${u.nombre} ${u.apellido}`}</li>
                          ))
                      )}
                    </ul>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {(() => {
                      const key = `${detalleReserva.cancha}-${detalleReserva.horario}`;
                      const count =
                        cantidades[key] ??
                        detalleReserva.usuarios.filter(
                          (u) =>
                            u.estado !== detalleReserva.estado_cancelada
                        ).length;
                      const full = count >= MAX_CAPACITY;
                      const yo = detalleReserva.usuarios.find(
                        (u) => u.usuario_id === user?.id
                      );
                      const cancelada =
                        yo?.estado === detalleReserva.estado_cancelada;

                      if (yo && !cancelada) {
                        return (
                          <button
                            className="px-4 py-2 rounded-lg bg-rose-500 text-white font-semibold hover:bg-rose-600"
                            onClick={() => cancelar(yo.reserva_id)}
                          >
                            Cancelar reserva
                          </button>
                        );
                      }
                      if (!full && user && (!yo || cancelada)) {
                        return (
                          <button
                            className="px-4 py-2 rounded-lg bg-amber-400 text-[#0B1220] font-bold hover:bg-amber-300"
                            onClick={() => {
                              setModalOpen(false);
                              reservar(
                                detalleReserva.cancha,
                                detalleReserva.horario
                              );
                            }}
                          >
                            Reservar
                          </button>
                        );
                      }
                      return (
                        <span className="text-sm text-slate-400">
                          {full
                            ? "Turno lleno."
                            : !user
                            ? "Inicia sesión para reservar."
                            : ""}
                        </span>
                      );
                    })()}

                    <button
                      className="px-4 py-2 rounded-lg font-semibold border bg-white/5 border-white/10"
                      onClick={() => setModalOpen(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL VER CANCHA */}
        {showCanchaDetalle && canchaDetalle && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div
              className="absolute inset-0"
              onClick={() => setShowCanchaDetalle(false)}
            />
            <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl">
              {/* Botón cerrar */}
              <button
                onClick={() => setShowCanchaDetalle(false)}
                className="absolute right-3 top-3 z-10 rounded-full bg-black/40 px-2 py-1 text-xs text-slate-200 hover:bg-black/70"
              >
                ✕
              </button>

              {/* Imagen header */}
              <div className="relative h-40 w-full md:h-56 overflow-hidden">
                <img
                  src={canchaDetalle.imagen_url || homeHeroPadel}
                  alt={canchaDetalle.nombre || "Cancha"}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = homeHeroPadel;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-xl font-semibold text-white drop-shadow">
                    {canchaDetalle.nombre || "Cancha"}
                  </h2>
                  {canchaDetalle.descripcion && (
                    <p className="mt-1 max-w-xl text-xs text-slate-200/90">
                      {canchaDetalle.descripcion}
                    </p>
                  )}
                </div>
              </div>

              {/* Contenido */}
              <div className="p-5 md:p-6 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Información general
                    </p>
                    <p className="text-sm text-slate-200">
                      Turnos de hasta{" "}
                      <span className="font-semibold text-amber-300">
                        {MAX_CAPACITY} jugadores
                      </span>{" "}
                      por horario. Las reservas y el matcheo entre
                      jugadores se gestionan desde esta pantalla.
                    </p>
                  </div>
                </div>

                {/* Horarios de la cancha */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Horarios de esta cancha
                  </p>
                  {canchaDetalle.horarios &&
                  canchaDetalle.horarios.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {canchaDetalle.horarios.map((h) => (
                        <span
                          key={h}
                          className="inline-flex items-center rounded-full border border-amber-400/60 bg-amber-400/10 px-3 py-1 text-xs text-amber-50"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Esta cancha no tiene horarios propios configurados.
                      Está usando los horarios generales del club.
                    </p>
                  )}
                </div>

                <div className="pt-2 text-xs text-slate-500">
                  Los turnos se reservan desde el carrusel superior. El
                  detalle de cancha es solo informativo, como en tu
                  proyecto anterior.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmación de reserva */}
      <MessageConfirm
        mensaje={mensaje}
        onClose={handleCancelar}
        onConfirm={handleConfirmar}
        onCancel={handleCancelar}
      />
    </div>
  );
}
