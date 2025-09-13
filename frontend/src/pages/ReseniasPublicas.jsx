import React, { useEffect, useState } from "react";
import { FiUser } from "react-icons/fi";

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

const ReseniasPublicas = () => {
  const [topJugadores, setTopJugadores] = useState([]);
  const [ultimasResenias, setUltimasResenias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [top, ult] = await Promise.all([
          getJSON(`${API_BASE}/top-jugadores`),
          getJSON(`${API_BASE}/ultimas?limit=10`),
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

  return (
    <div className="max-w-5xl mx-auto p-6 text-white">
      <h1 className="text-4xl font-bold text-center text-[#eaff00] mb-8">
        Comunidad - Reseñas
      </h1>

      {loading && <p className="text-center">Cargando...</p>}
      {!loading && errorMsg && <p className="text-center text-red-400">{errorMsg}</p>}

      {!loading && !errorMsg && (
        <>
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">🏆 Top Jugadores Mejor Calificados</h2>
            {topJugadores.length === 0 ? (
              <p className="text-gray-400">Aún no hay jugadores rankeados.</p>
            ) : (
              <ul className="space-y-3">
                {topJugadores.map((jugador, idx) => (
                  <li
                    key={jugador.jugador_id || jugador._id || idx}
                    className="bg-gray-800 p-4 rounded-md flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-lg">
                        {idx + 1}. {jugador.nombre} {jugador.apellido}
                        {jugador.username && (
                          <span className="text-sm text-gray-400 ml-2">@{jugador.username}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-300 font-bold text-lg">
                        ⭐ {Number(jugador.promedio).toFixed(2)} / 5
                      </p>
                      <p className="text-sm text-gray-400">
                        {jugador.cantidad} reseña{jugador.cantidad === 1 ? "" : "s"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">🆕 Últimas Reseñas</h2>
            {ultimasResenias.length === 0 ? (
              <p className="text-gray-400">Todavía no hay reseñas.</p>
            ) : (
              <ul className="space-y-4">
                {ultimasResenias.map((r, i) => (
                  <li key={r._id || i} className="bg-gray-900 p-4 rounded-md border border-gray-700">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                      <span>
                        <FiUser className="inline-block mr-1" />
                        <b>{r.autor?.nombre} {r.autor?.apellido}</b> reseñó a{" "}
                        <b>{r.destinatario?.nombre} {r.destinatario?.apellido}</b>
                      </span>
                      <span>{r.fecha ? new Date(r.fecha).toLocaleDateString("es-AR") : ""}</span>
                    </div>
                    <div className="text-yellow-400 text-lg">
                      {"★".repeat(Number(r.numero) || 0)}
                      {"☆".repeat(5 - (Number(r.numero) || 0))}
                    </div>
                    {r.observacion && <p className="text-gray-200 italic mt-2">“{r.observacion}”</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default ReseniasPublicas;
