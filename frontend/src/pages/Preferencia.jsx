import { useEffect, useState, useMemo } from "react";
import { generarHorarios } from "../components/usuarios/ReservaTabla";
import Button from "../components/common/Button/Button";
import MiToast from "../components/common/Toast/MiToast";
import { toast } from "react-toastify";

/* ------------------------------------------
   Config
------------------------------------------- */
const BACKEND_URL = `http://${window.location.hostname}:8000`;

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const canchasDisponibles = ["Blindex A", "Blindex B", "Blindex C", "Cemento Techada", "Cemento Sin Techar"];
const horariosDisponibles = generarHorarios();
const LIMITE_PREFS = 7;

/* ------------------------------------------
   UI helpers
------------------------------------------- */
const cx = (...c) => c.filter(Boolean).join(" ");

const Card = ({ className, children }) => (
  <div
    className={cx(
      "rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,.25)]",
      className
    )}
  >
    {children}
  </div>
);

const SectionHeader = ({ title, hint }) => (
  <div className="mb-2">
    <p className="text-[11px] uppercase tracking-wider text-slate-400">{hint}</p>
    <h3 className="text-lg font-extrabold text-white">{title}</h3>
  </div>
);

const Chip = ({ active, children, onClick, color = "amber" }) => {
  const activeStyles =
    color === "green"
      ? "bg-emerald-300 text-slate-950"
      : color === "purple"
      ? "bg-violet-300 text-slate-950"
      : "bg-amber-300 text-slate-950";

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "px-3 py-1 rounded-full text-sm font-semibold transition-all ring-1 focus:outline-none focus-visible:ring-2",
        active ? activeStyles : "bg-slate-800/80 text-slate-200 ring-white/10 hover:ring-amber-300/40",
        "hover:-translate-y-[1px]"
      )}
    >
      {children}
    </button>
  );
};

const Tag = ({ children, tone = "neutral" }) => {
  const tones = {
    neutral: "bg-slate-800 text-slate-200 ring-white/10",
    green: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/20",
    purple: "bg-violet-400/15 text-violet-200 ring-violet-400/20",
    amber: "bg-amber-300/15 text-amber-200 ring-amber-300/20",
  };
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1", tones[tone])}>
      {children}
    </span>
  );
};

/* ------------------------------------------
   Main Component
------------------------------------------- */
export default function PreferenciasUsuario() {
  const habilitado = localStorage.getItem("habilitado");
  const [preferencias, setPreferencias] = useState({ dias: [], horarios: [], canchas: [] });
  const [preferenciasGuardadas, setPreferenciasGuardadas] = useState([]);
  const [preferenciaEditar, setPreferenciaEditar] = useState(null);

  // cargar guardadas
  useEffect(() => {
    const url =
      window.location.hostname === "localhost"
        ? `${BACKEND_URL}/api/preferencias/obtener`
        : "/api/preferencias/obtener";
    fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPreferenciasGuardadas(data))
      .catch(() => {});
  }, []);

  const reachedLimit = !preferenciaEditar && preferenciasGuardadas.length >= LIMITE_PREFS;

  const handleToggle = (key, item) => {
    setPreferencias((prev) => ({
      ...prev,
      [key]: prev[key].includes(item) ? prev[key].filter((i) => i !== item) : [...prev[key], item],
    }));
  };

  const resetConstructor = () => setPreferencias({ dias: [], horarios: [], canchas: [] });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!preferencias.dias.length || !preferencias.horarios.length || !preferencias.canchas.length) {
      toast(<MiToast mensaje="Seleccioná al menos un día, un horario y una cancha." color="--var-color-red-400" />);
      return;
    }

    const isEditing = !!preferenciaEditar;
    const url = isEditing
      ? window.location.hostname === "localhost"
        ? `${BACKEND_URL}/api/preferencias/modificar/${preferenciaEditar.id}`
        : `/api/preferencias/modificar/${preferenciaEditar.id}`
      : window.location.hostname === "localhost"
      ? `${BACKEND_URL}/api/preferencias/guardar`
      : "/api/preferencias/guardar";

    const res = await fetch(url, {
      method: isEditing ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
      body: JSON.stringify(preferencias),
    });

    if (res.ok) {
      toast(
        <MiToast
          mensaje={isEditing ? "Preferencia actualizada con éxito" : "Preferencias guardadas con éxito"}
          color="var(--color-green-400)"
        />
      );
      resetConstructor();
      setPreferenciaEditar(null);

      const urlObtener =
        window.location.hostname === "localhost"
          ? `${BACKEND_URL}/api/preferencias/obtener`
          : "/api/preferencias/obtener";
      fetch(urlObtener, { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } })
        .then((r) => r.json())
        .then(setPreferenciasGuardadas);
    } else {
      const err = await res.json();
      toast(<MiToast mensaje={`Error: ${err.detail || "Error desconocido"}`} color="var(--color-red-400)" />);
    }
  };

  const handleModificarClick = (pref) => {
    setPreferenciaEditar(pref);
    setPreferencias({ dias: pref.dias, horarios: pref.horarios, canchas: pref.canchas });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setPreferenciaEditar(null);
    resetConstructor();
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Eliminar esta preferencia?")) return;
    const url =
      window.location.hostname === "localhost"
        ? `${BACKEND_URL}/api/preferencias/eliminar/${id}`
        : `/api/preferencias/eliminar/${id}`;

    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
    });

    if (res.ok) {
      toast(<MiToast mensaje="Preferencia eliminada con éxito." color="[#e5ff00]" />);
      setPreferenciasGuardadas((prev) => prev.filter((p) => p.id !== id));
    } else {
      const err = await res.json();
      toast(<MiToast mensaje={`Error: ${err.detail || "Error desconocido"}`} color="var(--color-red-400)" />);
    }
  };

  const resumen = useMemo(
    () => [
      { label: "Días", items: preferencias.dias, tone: "amber" },
      { label: "Horarios", items: preferencias.horarios, tone: "green" },
      { label: "Canchas", items: preferencias.canchas, tone: "purple" },
    ],
    [preferencias]
  );

  if (!habilitado) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-rose-300 font-semibold">
            Debes estar habilitado para poder elegir tus preferencias.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Header limpio */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Preferencias</h1>
            <p className="text-slate-400 text-sm mt-1">
              Armá tu combinación ideal. Esto acelera tus próximas reservas.
            </p>
          </div>
          {preferenciaEditar && (
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-amber-300/10 text-amber-300 ring-amber-300/30">
              ✎ Modo edición
            </span>
          )}
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Constructor */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <Card className="p-5 sm:p-6">
            <SectionHeader title="Días preferidos" hint="Paso 1" />
            <div className="flex flex-wrap gap-2">
              {diasSemana.map((d) => (
                <Chip key={d} active={preferencias.dias.includes(d)} onClick={() => handleToggle("dias", d)}>
                  {d}
                </Chip>
              ))}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionHeader title="Horarios preferidos" hint="Paso 2" />
            <div className="flex flex-wrap gap-2">
              {horariosDisponibles.map((h) => (
                <Chip
                  key={h}
                  color="green"
                  active={preferencias.horarios.includes(h)}
                  onClick={() => handleToggle("horarios", h)}
                >
                  {h}
                </Chip>
              ))}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionHeader title="Canchas preferidas" hint="Paso 3" />
            <div className="flex flex-wrap gap-2">
              {canchasDisponibles.map((c) => (
                <Chip
                  key={c}
                  color="purple"
                  active={preferencias.canchas.includes(c)}
                  onClick={() => handleToggle("canchas", c)}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </Card>
        </div>

        {/* Resumen sticky + acción */}
        <aside className="lg:col-span-5 xl:col-span-4">
          <Card className="p-5 sm:p-6 lg:sticky lg:top-6">
            <div className="mb-3">
              <p className="text-xs uppercase tracking-wider text-slate-400">Resumen</p>
              <h3 className="text-lg font-extrabold text-white">Tu selección</h3>
            </div>

            <div className="space-y-3">
              {resumen.map((row) => (
                <div key={row.label}>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{row.label}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {row.items.length ? (
                      row.items.map((t) => (
                        <Tag key={t} tone={row.tone}>
                          {t}
                        </Tag>
                      ))
                    ) : (
                      <Tag>—</Tag>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                texto={preferenciaEditar ? "Actualizar" : "Guardar"}
                onClick={handleSubmit}
                className="w-full"
                disabled={reachedLimit}
              />
              {preferenciaEditar ? (
                <Button texto="Cancelar" variant="secondary" onClick={handleCancelEdit} className="w-full" />
              ) : (
                <Button texto="Limpiar" variant="secondary" onClick={resetConstructor} className="w-full" />
              )}
            </div>

            {reachedLimit && (
              <p className="mt-3 text-amber-300 text-xs">
                Límite de {LIMITE_PREFS} preferencias alcanzado. Eliminá alguna para crear otra.
              </p>
            )}
          </Card>
        </aside>
      </div>

      {/* Guardadas */}
      <div className="mt-8">
        <h2 className="text-xl font-extrabold text-white mb-3">Tus preferencias guardadas</h2>

        {preferenciasGuardadas.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-300">No tenés preferencias guardadas todavía.</p>
          </Card>
        ) : (
          <ul className="space-y-4">
            {preferenciasGuardadas.map((pref) => (
              <Card key={pref.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      {pref.dias.map((d) => (
                        <Tag key={d} tone="amber">
                          {d}
                        </Tag>
                      ))}
                    </div>

                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Horarios</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {pref.horarios.map((h) => (
                            <Tag key={h} tone="green">
                              {h}
                            </Tag>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Canchas</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {pref.canchas.map((c) => (
                            <Tag key={c} tone="purple">
                              {c}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button texto="Modificar" variant="yellow" onClick={() => handleModificarClick(pref)} />
                    <Button texto="Eliminar" variant="danger" onClick={() => handleEliminar(pref.id)} />
                  </div>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
