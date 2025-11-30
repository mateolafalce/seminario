import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import adminApi from "../../../../shared/services/adminApi";
import backendClient from "../../../../shared/services/backendClient";
import Paginacion from "../../../../shared/components/ui/Paginacion";
import Button from "../../../../shared/components/ui/Button/Button";
import MiToast from "../../../../shared/components/ui/Toast/MiToast";
import { toast } from "react-toastify";
import { FiSearch, FiRefreshCw } from "react-icons/fi";
import {
  MdPeopleAlt,
  MdOutlineSportsTennis,
  MdAccessTime,
  MdCalendarToday,
} from "react-icons/md";

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

const diasSemana = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export default function GestionPreferencias() {
  // filtros multi
  const [filtrosCanchas, setFiltrosCanchas] = useState([]);
  const [filtrosDias, setFiltrosDias] = useState([]);
  const [filtrosHorarios, setFiltrosHorarios] = useState([]);

  // opciones
  const [canchasDisponibles, setCanchasDisponibles] = useState([]);
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);

  // resultados
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  const [loading, setLoading] = useState(false);
  const [loadingFiltros, setLoadingFiltros] = useState(false);
  const [error, setError] = useState(null);

  //toast control
  const [busquedaManual, setBusquedaManual] = useState(false);


  // cargar canchas y horarios
  useEffect(() => {
    const cargarFiltros = async () => {
      try {
        setLoadingFiltros(true);

        const [canchasData, horariosData] = await Promise.all([
          backendClient.get("canchas/listar"),
          backendClient.get("horarios/listar"),
        ]);

        const nombresCanchas = (canchasData || [])
          .map((c) => c?.nombre)
          .filter(Boolean);
        setCanchasDisponibles(
          [...new Set(nombresCanchas)].sort((a, b) => a.localeCompare(b))
        );

        const arrHorarios = Array.isArray(horariosData)
          ? horariosData.map((h) => h?.hora ?? h).filter(Boolean)
          : [];
        setHorariosDisponibles(arrHorarios);
      } catch (e) {
        console.error(e);
        setError("Error al cargar filtros.");
      } finally {
        setLoadingFiltros(false);
      }
    };

    cargarFiltros();
  }, []);

  const fetchData = async (pageToFetch = 1) => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        page: pageToFetch,
        limit,
        canchas: filtrosCanchas.length ? filtrosCanchas : null,
        dias: filtrosDias.length ? filtrosDias : null,
        horarios: filtrosHorarios.length ? filtrosHorarios : null,
      };

      const data = await adminApi.preferencias.adminSearch(payload);
      const prefs = data?.preferencias || data?.rows || [];

      setRows(prefs);
      setPage(Number(data?.page) || pageToFetch);
      setTotal(Number(data?.total) || prefs.length);

    } catch (e) {
      console.error(e);
      setRows([]);
      setTotal(0);
      setError(
        e?.data?.detail || "Error al buscar preferencias. Revisá el backend."
      );
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  if (!busquedaManual) return;  // ⬅️ evita que tire toast en la carga inicial

  if (rows.length > 0) {
    toast(
      <MiToast 
        mensaje={`Se encontraron ${rows.length} preferencias`} 
        color="#10b981" 
      />,
      { autoClose: 1000 }
    );
  } else {
    toast(
      <MiToast 
        mensaje="No se encontraron preferencias" 
        color="#ef4444" 
      />,
      { autoClose: 1000 }
    );
  }

  setBusquedaManual(false); // ⬅️ IMPORTANTÍSIMO para que no vuelva a disparar automáticamente
}, [rows]);




  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === TOGGLES: tocar de nuevo desmarca ===
  const toggleCancha = (cancha) => {
    setFiltrosCanchas((prev) =>
      prev.includes(cancha)
        ? prev.filter((c) => c !== cancha)
        : [...prev, cancha]
    );
  };

  const toggleDia = (dia) => {
    setFiltrosDias((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  const toggleHorario = (hor) => {
    setFiltrosHorarios((prev) =>
      prev.includes(hor) ? prev.filter((h) => h !== hor) : [...prev, hor]
    );
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    setBusquedaManual(true);
    fetchData(1);
  };

  const handleLimpiar = () => {
    setFiltrosCanchas([]);
    setFiltrosDias([]);
    setFiltrosHorarios([]);
    fetchData(1);
  };

  return (
    <motion.section
      className="w-full space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* HEADER */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5"
      >
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span className="text-yellow-400">
              <MdPeopleAlt />
            </span>
            Preferencias de Usuarios
          </h2>
          <p className="text-slate-400 mt-2 text-sm max-w-xl">
            Consultá las preferencias que cargaron los usuarios y filtrá por
            cancha, día y horario para entender mejor la demanda.
          </p>
        </div>
      </motion.div>

      {/* FILTROS */}
      <motion.form
        variants={itemVariants}
        onSubmit={handleBuscar}
        className="bg-slate-900/60 border border-slate-800 rounded-xl p-5"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMNA IZQUIERDA: canchas + días */}
          <div className="lg:col-span-7 space-y-5">
            {/* CANCHAS (multi) */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 flex items-center gap-2">
                <MdOutlineSportsTennis className="text-slate-400" />
                Canchas
              </label>
              <div className="flex flex-wrap gap-2">
                {/* TODAS */}
                <button
                  type="button"
                  onClick={() => setFiltrosCanchas([])}
                  className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                    filtrosCanchas.length === 0
                      ? "bg-yellow-500/10 border-yellow-400 text-yellow-200"
                      : "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                  }`}
                  disabled={loadingFiltros}
                >
                  Todas
                </button>

                {canchasDisponibles.map((c) => {
                  const activo = filtrosCanchas.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCancha(c)}
                      className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                        activo
                          ? "bg-yellow-500/10 border-yellow-400 text-yellow-200"
                          : "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                      }`}
                      disabled={loadingFiltros}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Si no seleccionás ninguna, se consideran todas las canchas.
              </p>
            </div>

            {/* DÍAS (multi) */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 flex items-center gap-2">
                <MdCalendarToday className="text-slate-400" />
                Días de la semana
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {/* TODOS DÍAS */}
                <button
                  type="button"
                  onClick={() => setFiltrosDias([])}
                  className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                    filtrosDias.length === 0
                      ? "bg-yellow-500/10 border-yellow-400 text-yellow-200"
                      : "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  Todos
                </button>

                {diasSemana.map((dia) => {
                  const activo = filtrosDias.includes(dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => toggleDia(dia)}
                      className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                        activo
                          ? "bg-yellow-500/10 border-yellow-400 text-yellow-200"
                          : "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Si no seleccionás ningún día, se consideran todos los días.
              </p>
            </div>
          </div>

          {/* COLUMNA DERECHA: horarios + botones */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* HORARIOS (multi) */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-400 mb-2 flex items-center gap-2">
                <MdAccessTime className="text-slate-400" />
                Horarios
              </label>
              <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                {/* TODOS HORARIOS */}
                <button
                  type="button"
                  onClick={() => setFiltrosHorarios([])}
                  className={`w-full flex justify-between items-center px-3 py-1.5 text-xs rounded-lg border transition-colors mb-1 ${
                    filtrosHorarios.length === 0
                      ? "bg-yellow-500/10 border-yellow-400 text-yellow-200"
                      : "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <span>Todos</span>
                  <span
                    className={`h-3 w-3 rounded-full border ${
                      filtrosHorarios.length === 0
                        ? "border-yellow-300 bg-yellow-400"
                        : "border-slate-500"
                    }`}
                  />
                </button>

                {horariosDisponibles.map((h) => {
                  const activo = filtrosHorarios.includes(h);
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => toggleHorario(h)}
                      className={`w-full flex justify-between items-center px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        activo
                          ? "bg-yellow-500/10 border-yellow-400 text-yellow-200"
                          : "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <span>{h}</span>
                      <span
                        className={`h-3 w-3 rounded-full border ${
                          activo
                            ? "border-yellow-300 bg-yellow-400"
                            : "border-slate-500"
                        }`}
                      />
                    </button>
                  );
                })}

                {!horariosDisponibles.length && !loadingFiltros && (
                  <p className="text-xs text-slate-500">
                    No hay horarios configurados.
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Si no seleccionás ningún horario, se consideran todos los horarios.
              </p>
            </div>

            {/* BOTONES */}
            <div className="flex flex-wrap gap-2 justify-end pt-1">
              <Button
                type="submit"
                texto="Buscar"
                icon={<FiSearch size={16} />}
                disabled={loading}
              />
              <Button
                type="button"
                texto="Limpiar"
                variant="secondary"
                icon={<FiRefreshCw size={16} />}
                onClick={handleLimpiar}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </motion.form>

      {/* TABLA RESULTADOS */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                  Nombre y Apellido
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                  DNI
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                  Días
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                  Horarios
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                  Canchas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-slate-400 text-sm"
                  >
                    Cargando preferencias...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-red-400 text-sm"
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-slate-400 text-sm"
                  >
                    No se encontraron preferencias con esos filtros.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                rows.map((p) => {
                  const nombreCompleto = [p.usuario_nombre, p.usuario_apellido]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-900/70 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-slate-200">
                        {p.usuario_username || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-200">
                        {nombreCompleto || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-200">
                        {p.usuario_dni || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-200">
                        <div className="flex flex-wrap gap-1">
                          {(p.dias || []).map((d) => (
                            <span
                              key={d}
                              className="px-2 py-1 rounded-full bg-slate-800 text-[11px]"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-200">
                        <div className="flex flex-wrap gap-1">
                          {(p.horarios || []).map((h) => (
                            <span
                              key={h}
                              className="px-2 py-1 rounded-full bg-slate-800 text-[11px]"
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-200">
                        <div className="flex flex-wrap gap-1">
                          {(p.canchas || []).map((c) => (
                            <span
                              key={c}
                              className="px-2 py-1 rounded-full bg-slate-800 text-[11px]"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Paginacion
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => fetchData(p)}
            loading={loading}
          />
        </div>
      )}
    </motion.section>
  );
}
