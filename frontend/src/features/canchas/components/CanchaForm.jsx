import { useEffect, useState } from "react";
import Button from "../../../shared/components/ui/Button/Button";
import backendClient from "../../../shared/services/backendClient";
import adminApi from "../../../shared/services/adminApi";

// default estable, misma referencia en todos los renders
const defaultValues = {
  nombre: "",
  descripcion: "",
  imagen_url: "",
  habilitada: true,
  horarios: [],
};

export default function CanchaForm({
  initialValues = defaultValues,
  onSubmit,
  submitText = "Guardar",
  loading = false,
  erroresExternos = {},
}) {
  // 👇 usamos inicializador de useState y NO hay useEffect
  const [v, setV] = useState(() => ({
    ...defaultValues,
    ...initialValues,
  }));
  const [errs, setErrs] = useState({});
  const [uploadState, setUploadState] = useState({
    uploading: false,
    error: "",
  });
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(true);

  useEffect(() => {
    let cancelado = false;

    const cargarHorarios = async () => {
      try {
        setCargandoHorarios(true);
        const data = await adminApi.horarios.listNormalized(); // [{id,hora}]
        if (!cancelado) {
          setHorariosDisponibles(data || []);
        }
      } catch (e) {
        console.error("Error cargando horarios", e);
        if (!cancelado) {
          setHorariosDisponibles([]);
        }
      } finally {
        if (!cancelado) setCargandoHorarios(false);
      }
    };

    cargarHorarios();
    return () => {
      cancelado = true;
    };
  }, []);

  const toggleHorario = (id) => {
    setV((prev) => {
      const actuales = Array.isArray(prev.horarios) ? prev.horarios : [];
      if (actuales.includes(id)) {
        return { ...prev, horarios: actuales.filter((h) => h !== id) };
      }
      return { ...prev, horarios: [...actuales, id] };
    });
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadState({
        uploading: false,
        error: "Solo se permiten archivos de imagen",
      });
      return;
    }

    const formData = new FormData();
    formData.append("archivo", file);

    try {
      setUploadState({ uploading: true, error: "" });

      const resp = await backendClient.post("canchas/subir-imagen", formData);

      if (resp?.url) {
        // Actualizo el campo imagen_url del form con la URL que devolvió el backend
        setV((prev) => ({
          ...prev,
          imagen_url: resp.url,
        }));
      } else {
        setUploadState({
          uploading: false,
          error: "La API no devolvió la URL de la imagen",
        });
      }
    } catch (error) {
      console.error("Error subiendo imagen de cancha", error);
      const mensaje =
        error?.data?.detail ||
        error?.detail ||
        error?.message ||
        "No se pudo subir la imagen";
      setUploadState({
        uploading: false,
        error: mensaje,
      });
    } finally {
      setUploadState((prev) => ({
        ...prev,
        uploading: false,
      }));
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const nombre = (v.nombre || "").trim();

    if (!nombre) {
      return setErrs({ nombre: "El nombre es obligatorio" });
    }

    setErrs({});

    const payload = {
      nombre,
      descripcion: (v.descripcion || "").trim(),
      imagen_url: (v.imagen_url || "").trim(),
      habilitada: !!v.habilitada,
      horarios: Array.isArray(v.horarios) ? v.horarios : [],
    };

    await onSubmit?.(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nombre */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">Nombre</label>
        <input
          type="text"
          value={v.nombre}
          onChange={(e) =>
            setV((prev) => ({ ...prev, nombre: e.target.value }))
          }
          className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
          placeholder="Ej: Cancha 1"
          required
        />
        {(errs.nombre || erroresExternos.nombre) && (
          <p className="text-red-400 text-sm mt-1">
            {errs.nombre || erroresExternos.nombre}
          </p>
        )}
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Descripción (opcional)
        </label>
        <textarea
          value={v.descripcion}
          onChange={(e) =>
            setV((prev) => ({ ...prev, descripcion: e.target.value }))
          }
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/70 resize-none"
          placeholder="Ej: Cancha techada, superficie sintética, ideal para partidos nocturnos..."
        />
      </div>

      {/* Imagen */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Imagen
        </label>

        {/* Campo de texto para URL (se sigue pudiendo pegar una URL si querés) */}
        <input
          type="text"
          value={v.imagen_url}
          onChange={(e) =>
            setV((prev) => ({ ...prev, imagen_url: e.target.value }))
          }
          className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
          placeholder="https://... (opcional, se completa al subir archivo)"
        />

        {/* Selector de archivo para subir imagen nueva */}
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
            disabled={uploadState.uploading}
            className="text-xs text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600/90 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-emerald-500/90 disabled:opacity-50"
          />
          {uploadState.uploading && (
            <span className="text-xs text-gray-400">Subiendo imagen…</span>
          )}
        </div>

        {uploadState.error && (
          <p className="text-xs text-red-400">{uploadState.error}</p>
        )}
      </div>

      {/* Habilitada */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setV((prev) => ({ ...prev, habilitada: !prev.habilitada }))
          }
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            v.habilitada ? "bg-emerald-500" : "bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              v.habilitada ? "translate-x-5" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-sm text-gray-200">
          {v.habilitada
            ? "Cancha habilitada para reservas"
            : "Cancha deshabilitada"}
        </span>
      </div>

      {/* Horarios habilitados */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-200">
          Horarios habilitados
        </label>

        {cargandoHorarios ? (
          <p className="text-sm text-slate-400">Cargando horarios…</p>
        ) : !horariosDisponibles.length ? (
          <p className="text-sm text-slate-400">
            No hay horarios configurados. Crealos primero en la pestaña
            &quot;Horarios&quot; del panel.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {horariosDisponibles.map((h) => {
              const seleccionados = Array.isArray(v.horarios)
                ? v.horarios
                : [];
              const checked = seleccionados.includes(h.id);

              return (
                <label
                  key={h.id}
                  className="flex items-center gap-2 text-sm text-slate-200"
                >
                  <input
                    type="checkbox"
                    className="rounded border-slate-500 bg-transparent"
                    checked={checked}
                    onChange={() => toggleHorario(h.id)}
                  />
                  <span>{h.hora}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {erroresExternos.general && (
        <p className="text-red-400 text-sm">{erroresExternos.general}</p>
      )}

      <Button
        type="submit"
        disabled={loading || uploadState.uploading}
        texto={loading ? "Guardando..." : submitText}
        variant="crear"
        size="pill"
        className="w-full"
      />
    </form>
  );
}
