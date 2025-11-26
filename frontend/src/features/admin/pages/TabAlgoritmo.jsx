import { useEffect, useMemo, useState } from 'react';
import algoritmoApi from '../../../shared/services/algoritmoApi';

export default function TabAlgoritmo() {
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [selectedUser, setSelectedUser] = useState(null);
  const [topK, setTopK] = useState(5);
  const [loadingTop, setLoadingTop] = useState(false);
  const [topItems, setTopItems] = useState([]);

  const [busyAction, setBusyAction] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  useEffect(() => {
    const load = async () => {
      setLoadingUsers(true);
      setErr(null);
      try {
        const res = await algoritmoApi.users(page, limit);
        const items = (res?.items || []).map(u => ({
          ...u,
          categoria: !u?.categoria
            ? null
            : (typeof u.categoria === 'object'
                ? (u.categoria.nombre ?? `Nivel ${u.categoria.nivel ?? '-'}`)
                : String(u.categoria)),
        }));
        setUsers(items);
        setTotal(res?.total || 0);
      } catch (e) {
        setErr('No se pudieron cargar los usuarios');
      } finally {
        setLoadingUsers(false);
      }
    };
    load();
  }, [page, limit]);

  const handleViewTop = async (user) => {
    setSelectedUser(user);
    setLoadingTop(true);
    setErr(null);
    setTopItems([]);
    try {
      const res = await algoritmoApi.top(user.id, topK);
      setTopItems(res?.items || []);
    } catch (e) {
      setErr('No se pudo cargar el TOP para ese usuario');
    } finally {
      setLoadingTop(false);
    }
  };

  const handleRecompute = async () => {
    setBusyAction(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await algoritmoApi.recompute();
      setMsg(res?.msg || 'Recalculo disparado');
      if (selectedUser) await handleViewTop(selectedUser);
    } catch (e) {
      setErr('Error al recalcular relaciones');
    } finally {
      setBusyAction(false);
    }
  };

  const handleOptimize = async () => {
    setBusyAction(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await algoritmoApi.optimize();
      setMsg(res?.msg || 'Optimización de β completada');
      if (selectedUser) await handleViewTop(selectedUser);
    } catch (e) {
      setErr('Error al optimizar β');
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con título y descripción */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-white">Algoritmo de Matcheo</h1>
        <p className="text-sm text-gray-400 leading-relaxed max-w-4xl">
          Visualizá cómo se calcula <span className="text-yellow-400 font-semibold">A = α·S + β·J</span>. Si faltan preferencias/categoría, 
          <span className="text-yellow-400"> S</span> se ignora y <span className="text-yellow-400">A≈J</span> (con suavizado). 
          Usá los botones para <span className="font-medium text-white">Recalcular</span> relaciones y <span className="font-medium text-white">Optimizar β</span>.
        </p>
        
        {/* Mensajes de estado */}
        {msg && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-emerald-400 text-sm font-medium">{msg}</span>
          </div>
        )}
        {err && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-400 text-sm font-medium">{err}</span>
          </div>
        )}
      </div>

      {/* Controles principales */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-gray-800/50 border border-gray-700">
        <button
          onClick={handleRecompute}
          disabled={busyAction}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-white shadow-lg hover:shadow-blue-500/20"
        >
          {busyAction ? 'Procesando...' : 'Recalcular relaciones'}
        </button>
        <button
          onClick={handleOptimize}
          disabled={busyAction}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-white shadow-lg hover:shadow-emerald-500/20"
        >
          {busyAction ? 'Procesando...' : 'Optimizar β'}
        </button>
        
        <div className="ml-auto flex items-center gap-3 bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-700">
          <label className="text-sm font-medium text-gray-300">Top K:</label>
          <input
            type="number"
            min={1}
            max={50}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value || 5))}
            className="w-16 px-2 py-1 rounded-md bg-gray-800 border border-gray-600 text-white text-center focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
      </div>

      {/* Tabla de usuarios */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Usuarios</h2>

        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/30">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-800/80 backdrop-blur">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Apellido</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Jugados</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-400">Cargando usuarios...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No hay usuarios para mostrar
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-white font-medium">{u.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{u.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{u.apellido}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 rounded-md bg-gray-700/50 text-gray-300 text-xs">
                          {u.categoria ?? 'Sin categoría'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{u.jugados}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleViewTop(u)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors text-sm font-medium text-white shadow-md hover:shadow-indigo-500/20"
                        >
                          Ver TOP {topK}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación mejorada */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800/30 rounded-lg border border-gray-700">
          <span className="text-sm text-gray-400">
            Total: <span className="font-semibold text-white">{total}</span> usuarios
          </span>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Anterior
            </button>
            <span className="px-3 py-1.5 text-sm font-medium text-gray-300">
              Página <span className="text-white">{page}</span> de <span className="text-white">{totalPages}</span>
            </span>
            <button
              className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente →
            </button>
          </div>
        </div>
      </section>

      {/* TOP del usuario seleccionado */}
      {selectedUser && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">
              TOP {topK} para <span className="text-yellow-400">{selectedUser.nombre} {selectedUser.apellido}</span>
            </h2>
            <span className="text-sm text-gray-400">@{selectedUser.username}</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/30">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-800/80 backdrop-blur">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Usuario</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Nombre</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Apellido</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Categoría</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-yellow-400 uppercase">S</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-blue-400 uppercase">J</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-300 uppercase">α</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-300 uppercase">β</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-emerald-400 uppercase">A (calc)</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-300 uppercase">A (guardado)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {loadingTop ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-gray-400">Calculando matches...</span>
                        </div>
                      </td>
                    </tr>
                  ) : topItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                        No hay resultados para mostrar
                      </td>
                    </tr>
                  ) : (
                    topItems.map((row, idx) => {
                      const j = row.j || {};
                      const sc = row.scores || {};
                      return (
                        <tr key={j.id || idx} className="hover:bg-gray-700/20 transition-colors">
                          <td className="px-3 py-3 font-medium text-white">{j.username}</td>
                          <td className="px-3 py-3 text-gray-300">{j.nombre}</td>
                          <td className="px-3 py-3 text-gray-300">{j.apellido}</td>
                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 rounded text-xs bg-gray-700/50 text-gray-300">
                              {j.categoria ?? 'Sin categoría'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-yellow-400">{fmt(sc.S)}</td>
                          <td className="px-3 py-3 text-right font-mono text-blue-400">{fmt(sc.J)}</td>
                          <td className="px-3 py-3 text-right font-mono text-gray-300">{fmt(sc.alpha)}</td>
                          <td className="px-3 py-3 text-right font-mono text-gray-300">{fmt(sc.beta)}</td>
                          <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-400">{fmt(sc.A_calc)}</td>
                          <td className="px-3 py-3 text-right font-mono text-gray-400">{fmt(sc.A_saved)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
            <p className="text-xs text-gray-400 leading-relaxed">
              <span className="font-semibold text-gray-300">Notas:</span> Si <span className="text-yellow-400">S</span> es <i>None</i> (sin preferencias/categoría suficiente), 
              <span className="text-emerald-400"> A</span> usa solo <span className="text-blue-400">J</span> (con suavizado). 
              <span className="text-gray-300"> β</span> se aprende con datos históricos (reservas confirmadas + logs de notificaciones).
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function fmt(x) {
  if (x === null || x === undefined) return '-';
  const n = Number(x);
  if (Number.isNaN(n)) return '-';
  return n.toFixed(3);
}
