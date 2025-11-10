import React, { useEffect, useState } from "react";
import {
  FiUser,
  FiMessageSquare,
  FiStar,
  FiCalendar,
  FiTrendingUp,
} from "react-icons/fi";
import { FaCrown, FaMedal } from "react-icons/fa";
import { AiFillStar, AiOutlineStar } from "react-icons/ai";

const BACKEND_URL = `http://${window.location.hostname}:8000`;
const API_BASE =
  window.location.hostname === "localhost"
    ? `${BACKEND_URL}/api/resenias`
    : "/api/resenias";

async function getJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
  return resp.json();
}

/* ---------- Helpers UI ---------- */
function StarRow({ value = 0, size = "text-xl" }) {
  const v = Math.max(0, Math.min(5, Math.round(Number(value))));
  return (
    <div className={`flex items-center gap-1 ${size}`}>
      {Array.from({ length: 5 }).map((_, i) =>
        i < v ? (
          <AiFillStar key={i} className="text-yellow-400" />
        ) : (
          <AiOutlineStar key={i} className="text-gray-600" />
        )
      )}
    </div>
  );
}

function StatCard({ icon, title, value, sub, ring = "ring-blue-400/40" }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-[#15151b]/80 ring-1 ${ring}`}>
      <div className="pointer-events-none absolute -inset-16 bg-gradient-to-br from-white/10 to-transparent blur-2xl" />
      <div className="relative flex items-center gap-4 px-5 py-4">
        <div className="grid place-items-center h-12 w-12 rounded-lg bg-white/5 ring-1 ring-inset ring-white/10">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-xl font-semibold tracking-tight">{value}</p>
          {sub ? <p className="text-xs text-gray-500 mt-0.5">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return <div className="animate-pulse bg-white/5 rounded-xl h-16 ring-1 ring-inset ring-white/10" />;
}

/* ---------- ReviewCard (reutilizable) ---------- */
function ReviewCard({
  autorNombre,
  autorApellido,
  destNombre,
  destApellido,
  fecha,
  score = 0,
  observacion = "",
  timeline = true,
}) {
  const [expanded, setExpanded] = useState(false);
  const fechaTxt = fecha ? new Date(fecha).toLocaleDateString("es-AR") : "";
  const max = 160;
  const isLong = (observacion || "").length > max;
  const textShown = expanded || !isLong ? observacion : `${observacion.slice(0, max)}…`;

  return (
    <li className="relative mb-6 rounded-xl border border-white/10 bg-[#17171f] p-5 shadow-lg transition hover:shadow-2xl hover:border-blue-400/40">
      {timeline && (
        <>
          <span className="absolute -left-6 top-6 h-3 w-3 rounded-full bg-blue-400 ring-4 ring-blue-400/20" />
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
        <span className="flex items-center gap-2">
          <FiUser className="text-gray-300" />
          <b className="text-gray-100">
            {autorNombre} {autorApellido}
          </b>
          <span className="text-gray-500">reseñó a</span>
          <b className="text-gray-100">
            {destNombre} {destApellido}
          </b>
        </span>
        <span className="flex items-center gap-1">
          <FiCalendar />
          {fechaTxt}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <StarRow value={Number(score)} />
        <span className="text-sm text-gray-400">{Number(score)}/5</span>
      </div>

      {observacion ? (
        <div className="mt-3 flex gap-2">
          <FiMessageSquare className="mt-0.5 text-blue-300 flex-shrink-0" />
          <p className="italic text-gray-200">
            “{textShown}”
            {isLong && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => setExpanded((s) => !s)}
                  className="text-blue-300 hover:text-blue-200 underline underline-offset-2"
                >
                  {expanded ? "ver menos" : "ver más"}
                </button>
              </>
            )}
          </p>
        </div>
      ) : null}
    </li>
  );
}

/* ---------- Página principal ---------- */
export default function ReseniasPublicas() {
  const [topJugadores, setTopJugadores] = useState([]);
  const [ultimasResenias, setUltimasResenias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [top, ult] = await Promise.all([
          getJSON(`${API_BASE}/top-jugadores`),
          getJSON(`${API_BASE}/ultimas?limit=12`),
        ]);
        setTopJugadores(Array.isArray(top) ? top : []);
        setUltimasResenias(Array.isArray(ult) ? ult : []);
      } catch (e) {
        console.error(e);
        setErrorMsg("No pudimos cargar los datos de reseñas.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalResenias = ultimasResenias.length;
  const usuariosTop = new Set(
    topJugadores.map(
      (j) => j?.username || `${j?.nombre || ""}-${j?.apellido || ""}`
    )
  ).size;

  return (
    <div className="relative max-w-6xl mx-auto px-6 py-12 text-white">

      {/* Header */}
      <header className="mb-10 text-center">
      
        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
          Reseñas & Reputación
        </h1>
        <p className="mt-2 text-gray-400">
          Descubre a los mejores jugadores y las opiniones más recientes
        </p>
      </header>

      {/* Stats (sin “promedio global”) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <StatCard
          icon={<FiMessageSquare className="text-blue-300 text-xl" />}
          title="Reseñas recientes"
          value={`${totalResenias}`}
          sub="Últimas cargadas"
          ring="ring-blue-400/40"
        />
        <StatCard
          icon={<FiUser className="text-pink-300 text-xl" />}
          title="Usuarios en Top"
          value={`${usuariosTop}`}
          sub="Ranking actual"
          ring="ring-pink-400/40"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-4">
            <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
          </div>
          <div className="space-y-4">
            <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
          </div>
        </div>
      ) : errorMsg ? (
        <p className="text-center text-red-500 font-semibold">{errorMsg}</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Leaderboard Top Jugadores */}
          <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <FaCrown className="text-yellow-400 text-2xl" />
              <h2 className="text-2xl font-bold tracking-tight">Top Jugadores</h2>
            </div>

            {topJugadores.length === 0 ? (
              <p className="text-gray-400">Aún no hay jugadores rankeados.</p>
            ) : (
              <ul className="space-y-4">
                {topJugadores.map((jugador, idx) => {
                  const rank = idx + 1;
                  const promedio = Number(jugador?.promedio || 0);
                  const cantidad = Number(jugador?.cantidad || 0);
                  const key = jugador?.jugador_id || jugador?._id || idx;
                  const medalGradient =
                    rank === 1
                      ? "from-yellow-400 to-amber-500"
                      : rank === 2
                      ? "from-gray-200 to-gray-400"
                      : rank === 3
                      ? "from-amber-700 to-orange-600"
                      : "from-slate-600 to-slate-700";

                  return (
                    <li
                      key={key}
                      className="relative overflow-hidden rounded-xl border border-white/10 bg-[#181820] p-4 transition-transform hover:-translate-y-0.5 hover:shadow-2xl"
                    >
                      <div className="absolute -right-10 -top-10 h-28 w-28 bg-gradient-to-br from-white/5 to-transparent rotate-45" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`h-12 w-12 rounded-full grid place-items-center bg-gradient-to-br ${medalGradient} text-black font-bold shadow`}
                            title={`#${rank}`}
                          >
                            {rank <= 3 ? (
                              <FaMedal className="text-black/70" />
                            ) : (
                              <span className="text-white/80">{rank}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-lg font-semibold flex items-center gap-2">
                              <FiUser className="text-gray-400" />
                              {jugador?.nombre} {jugador?.apellido}
                            </p>
                            {jugador?.username ? (
                              <p className="text-sm text-gray-500">@{jugador.username}</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <StarRow value={promedio} />
                            <span className="text-yellow-300 font-bold">
                              {promedio.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {cantidad} reseña{cantidad === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 h-1.5 rounded bg-white/5">
                        <div
                          className="h-full rounded bg-gradient-to-r from-yellow-400 to-amber-500"
                          style={{ width: `${(Math.min(5, promedio) / 5) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Últimas Reseñas (usa ReviewCard) */}
          <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <FiTrendingUp className="text-blue-300 text-2xl" />
              <h2 className="text-2xl font-bold tracking-tight">Últimas Reseñas</h2>
            </div>

            {ultimasResenias.length === 0 ? (
              <p className="text-gray-400">Todavía no hay reseñas.</p>
            ) : (
              <ul className="relative pl-6 before:content-[''] before:absolute before:left-3 before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-white/20 before:to-transparent">
                {ultimasResenias.map((r, i) => (
                  <ReviewCard
                    key={r?._id || i}
                    autorNombre={r?.autor?.nombre}
                    autorApellido={r?.autor?.apellido}
                    destNombre={r?.destinatario?.nombre}
                    destApellido={r?.destinatario?.apellido}
                    fecha={r?.fecha}
                    score={r?.numero}
                    observacion={r?.observacion}
                    timeline
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
