import { useEffect, useState } from "react";
import { generarHorarios } from "../components/usuarios/ReservaTabla";
import Button from "../components/common/Button/Button";
import MiToast from "../components/common/Toast/MiToast";
import { toast } from "react-toastify";
import { FiCheck } from "react-icons/fi";

/* ------------------------------------------
   Config
------------------------------------------- */
const BACKEND_URL = `http://${window.location.hostname}:8000`;

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const horariosDisponibles = generarHorarios();
const LIMITE_PREFS = 7;

/* ------------------------------------------
   UI helpers (minimal)
------------------------------------------- */
const cx = (...c) => c.filter(Boolean).join(" ");

const Card = ({ className, children }) => (
  <div className={cx("rounded-xl border border-white/10 bg-white/[0.05] p-5 sm:p-6", className)}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-base sm:text-lg font-semibold text-white mb-3">{children}</h3>
);

function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition",
        "ring-1 focus:outline-none focus-visible:ring-2",
        active
          ? "!bg-[#eaff00] !text-[#0b1220] ring-[#eaff00]/60"
          : "bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10"
      )}
    >
      <span
        className={cx(
          "grid place-items-center h-4 w-4 rounded-full border",
          active ? "border-[#0b1220]" : "border-white/20"
        )}
      >
        {active ? <FiCheck size={12} /> : null}
      </span>
      {children}
    </button>
  );
}

/* ------------------------------------------
   Utils (presets simples)
------------------------------------------- */
const parseHour = (bloque) => Number((String(bloque).split("-")[0] || "00:00").split(":")[0] || 0);
const gruposHorarios = (lista) => {
  const m = [], t = [], n = [];
  lista.forEach((h) => {
    const hh = parseHour(h);
    if (hh < 12) m.push(h);
    else if (hh < 18) t.push(h);
    else n.push(h);
  });
  return { m, t, n };
};

/* ------------------------------------------
   Componente
------------------------------------------- */
export default function PreferenciasUsuario() {
  const habilitado = localStorage.getItem("habilitado");
  const [preferencias, setPreferencias] = useState({ dias: [], horarios: [], canchas: [] });
  const [preferenciasGuardadas, setPreferenciasGuardadas] = useState([]);
  const [preferenciaEditar, setPreferenciaEditar] = useState(null);
  const [canchasDisponibles, setCanchasDisponibles] = useState([]);
  const [loadingCanchas, setLoadingCanchas] = useState(true);

  // Cargar canchas desde el backend
  useEffect(() => {
    const fetchCanchas = async () => {
      try {
        const url =
          window.location.hostname === "localhost"
            ? `${BACKEND_URL}/api/canchas/listar`
            : "/api/canchas/listar";
        
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
        });

        if (res.ok) {
          const data = await res.json();
          // Extraer solo los nombres de las canchas
          setCanchasDisponibles(data.map(cancha => cancha.nombre));
        } else {
          toast(<MiToast mensaje="Error al cargar las canchas" color="#ef4444" />);
        }
      } catch (error) {
        console.error("Error fetching canchas:", error);
        toast(<MiToast mensaje="Error de conexión al cargar canchas" color="#ef4444" />);
      } finally {
        setLoadingCanchas(false);
      }
    };

    fetchCanchas();
  }, []);

  // cargar preferencias guardadas
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

  const toggleBulk = (key, list) => {
    setPreferencias((prev) => {
      const setPrev = new Set(prev[key]);
      const every = list.every((i) => setPrev.has(i));
      const next = new Set(prev[key]);
      (every ? list : list).forEach((i) => (every ? next.delete(i) : next.add(i)));
      return { ...prev, [key]: Array.from(next) };
    });
  };

  const resetConstructor = () => setPreferencias({ dias: [], horarios: [], canchas: [] });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!preferencias.dias.length || !preferencias.horarios.length || !preferencias.canchas.length) {
      toast(<MiToast mensaje="Seleccioná al menos un día, un horario y una cancha." color="#ef4444" />);
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
          mensaje={isEditing ? "Preferencia actualizada" : "Preferencias guardadas"}
          color="#eaff00"
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
      toast(<MiToast mensaje={`Error: ${err.detail || "Error desconocido"}`} color="#ef4444" />);
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
      toast(<MiToast mensaje="Preferencia eliminada." color="#eaff00" />);
      setPreferenciasGuardadas((prev) => prev.filter((p) => p.id !== id));
    } else {
      const err = await res.json();
      toast(<MiToast mensaje={`Error: ${err.detail || "Error desconocido"}`} color="#ef4444" />);
    }
  };

  const { m, t, n } = gruposHorarios(horariosDisponibles);
  const presetLaborables = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  const presetFinde = ["Sábado", "Domingo"];

  if (!habilitado) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-8">
        <Card className="text-center">
          <p className="text-rose-300 font-medium">
            Debes estar habilitado para poder elegir tus preferencias.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      {/* DÍAS */}
      <Card>
        <SectionTitle>Días</SectionTitle>
        <div className="pt- mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => toggleBulk("dias", presetLaborables)}
            className="text-xs rounded-full px-3 py-1 ring-1 ring-white/10 text-slate-200 hover:bg-white/10"
          >
            Laborables
          </button>
          <button
            onClick={() => toggleBulk("dias", presetFinde)}
            className="text-xs rounded-full px-3 py-1 ring-1 ring-white/10 text-slate-200 hover:bg-white/10"
          >
            Finde
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {diasSemana.map((d) => (
            <Chip key={d} active={preferencias.dias.includes(d)} onClick={() => handleToggle("dias", d)}>
              {d}
            </Chip>
          ))}
        </div>
      </Card>

      {/* HORARIOS */}
      <Card className="mt-6">
        <SectionTitle>Horarios</SectionTitle>
        <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-300">
          <button
            onClick={() => toggleBulk("horarios", m)}
            className="rounded-full px-3 py-1 ring-1 ring-white/10 hover:bg-white/10"
          >
            Mañana
          </button>
          <button
            onClick={() => toggleBulk("horarios", t)}
            className="rounded-full px-3 py-1 ring-1 ring-white/10 hover:bg-white/10"
          >
            Tarde
          </button>
          <button
            onClick={() => toggleBulk("horarios", n)}
            className="rounded-full px-3 py-1 ring-1 ring-white/10 hover:bg-white/10"
          >
            Noche
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {horariosDisponibles.map((h) => (
            <Chip key={h} active={preferencias.horarios.includes(h)} onClick={() => handleToggle("horarios", h)}>
              {h}
            </Chip>
          ))}
        </div>
      </Card>

      {/* CANCHAS */}
      <Card className="mt-6">
        <SectionTitle>Canchas</SectionTitle>
        {loadingCanchas ? (
          <p className="text-slate-300 text-sm">Cargando canchas...</p>
        ) : canchasDisponibles.length === 0 ? (
          <p className="text-slate-300 text-sm">No hay canchas disponibles.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {canchasDisponibles.map((c) => (
              <Chip key={c} active={preferencias.canchas.includes(c)} onClick={() => handleToggle("canchas", c)}>
                {c}
              </Chip>
            ))}
          </div>
        )}
      </Card>

      {/* Acciones */}
      <div className="mt-6 grid grid-cols-2 gap-2">
        <Button
          texto={preferenciaEditar ? "Actualizar" : "Guardar"}
          onClick={handleSubmit}
          className="w-full"
          disabled={reachedLimit || loadingCanchas}
        />
        {preferenciaEditar ? (
          <Button texto="Cancelar" variant="secondary" onClick={handleCancelEdit} className="w-full" />
        ) : (
          <Button texto="Limpiar" variant="secondary" onClick={resetConstructor} className="w-full" />
        )}
      </div>
      {reachedLimit && (
        <p className="mt-3 text-xs text-amber-300">
          Límite de {LIMITE_PREFS} preferencias alcanzado. Eliminá alguna para crear otra.
        </p>
      )}

      {/* Guardadas */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-white mb-3">Guardadas</h2>
        {preferenciasGuardadas.length === 0 ? (
          <Card className="text-center">
            <p className="text-slate-300">No tenés preferencias guardadas todavía.</p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {preferenciasGuardadas.map((pref) => (
              <Card key={pref.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-slate-300">
                    <span className="text-slate-200 font-medium">Días:</span> {pref.dias.join(", ")} •{" "}
                    <span className="text-slate-200 font-medium">Horarios:</span> {pref.horarios.join(", ")} •{" "}
                    <span className="text-slate-200 font-medium">Canchas:</span> {pref.canchas.join(", ")}
                  </div>
                  <div className="flex gap-2">
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
