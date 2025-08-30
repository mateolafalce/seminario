import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Jugadores = () => {
  const { apiFetch } = useContext(AuthContext);
  const [resenas, setResenas] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResenas = async () => {
      setLoading(true);
      const response = await apiFetch(`/api/users_b/reseñas/listar?page=${page}&limit=${limit}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('accessToken')}`,
        }
      });
      if (response.ok) {
        const data = await response.json();
        setResenas(data.resenas || []);
        setTotal(data.total || 0);
      } else {
        setResenas([]);
        setTotal(0);
      }
      setLoading(false);
    };
    fetchResenas();
  }, [apiFetch, page, limit]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-gray-900 p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-[#eaff00] mb-4 text-center">Reseñas a Jugadores</h2>
      {loading ? (
        <p className="text-white-300 text-center">Cargando reseñas...</p>
      ) : (
        <>
          <table className="w-full text-left mb-4">
            <thead>
              <tr className="text-white">
                <th>Jugador</th>
                <th>Calificación</th>
                <th>Observación</th>
              </tr>
            </thead>
            <tbody>
              {resenas.map(r => (
                <tr
                  key={r._id}
                  className="border-b-2 border-[#eaff00] text-white"
                  style={{ height: "3rem" }}
                >
                  <td className="py-3 px-2">
                    <div className="font-semibold">{r.con.nombre} {r.con.apellido}</div>
                    <div className="text-xs text-gray-300">{r.con.username}</div>
                    <div className="text-xs text-gray-400">{r.con.email}</div>
                  </td>
                  <td className="py-3 px-2 text-center font-bold">{r.calificacion}</td>
                  <td className="py-3 px-2">{r.observacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between items-center">
            <button
              className="bg-[#eaff00] text-[#0D1B2A] px-3 py-1 rounded font-bold disabled:opacity-50"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              Anterior
            </button>
            <span className="text-gray-300">
              Página {page} de {totalPages}
            </span>
            <button
              className="bg-[#eaff00] text-[#0D1B2A] px-3 py-1 rounded font-bold disabled:opacity-50"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Jugadores;