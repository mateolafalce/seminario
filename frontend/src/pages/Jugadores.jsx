import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { FiUser, FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { toast } from "react-toastify";

// ⭐ Función utilitaria para estrellas
const StarRating = ({ count }) => {
  const stars = Array.from({ length: 5 }, (_, i) => (
    <span key={i}>{i < count ? "★" : "☆"}</span>
  ));
  return <span className="text-yellow-400 text-lg">{stars}</span>;
};

const ReseniasRecibidas = () => {
  const { apiFetch } = useContext(AuthContext);
  const [resenias, setResenias] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(5);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResenias = async () => {
      setLoading(true);
      try {
        const response = await apiFetch(`/api/users_b/reseñas/listar?page=${page}&limit=${limit}`);
        if (response.ok) {
          const data = await response.json();
          setResenias(data.reseñas || []);
          setTotal(data.total || 0);
        } else {
          setResenias([]);
          setTotal(0);
          toast.error("Error al obtener reseñas");
        }
      } catch (error) {
        toast.error("Error al conectar con el servidor");
      }
      setLoading(false);
    };
    fetchResenias();
  }, [apiFetch, page, limit]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-3xl mx-auto mt-10 bg-gray-900 p-6 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-[#eaff00] mb-6 text-center">Reseñas Recibidas</h2>

      {loading ? (
        <p className="text-center text-white">Cargando reseñas...</p>
      ) : resenias.length === 0 ? (
        <p className="text-gray-400 text-center">Aún no recibiste reseñas.</p>
      ) : (
        <ul className="space-y-6">
          {resenias.map((r) => (
            <li key={r._id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <FiUser />
                  {r.autor.nombre} {r.autor.apellido}
                  {r.autor.username && (
                    <span className="text-gray-400 text-sm ml-2">@{r.autor.username}</span>
                  )}
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(r.fecha).toLocaleDateString("es-AR")}
                </span>
              </div>
              <StarRating count={r.numero} />
              <p className="text-gray-200 mt-2 italic">"{r.observacion}"</p>
            </li>
          ))}
        </ul>
      )}

      {/* Paginación */}
      {total > limit && (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="bg-[#eaff00] text-[#101a2a] px-4 py-2 rounded font-bold disabled:opacity-50"
          >
            <FiArrowLeft className="inline-block mr-1" />
            Anterior
          </button>

          <span className="text-gray-300">
            Página {page} de {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="bg-[#eaff00] text-[#101a2a] px-4 py-2 rounded font-bold disabled:opacity-50"
          >
            Siguiente
            <FiArrowRight className="inline-block ml-1" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ReseniasRecibidas;