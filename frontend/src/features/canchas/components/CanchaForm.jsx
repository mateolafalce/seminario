import { useState } from "react";
import Button from "../../../shared/components/ui/Button/Button";

// default estable, misma referencia en todos los renders
const defaultValues = {
  nombre: "",
  descripcion: "",
  imagen_url: "",
  habilitada: true,
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

      {/* URL Imagen */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          URL de imagen (opcional)
        </label>
        <input
          type="url"
          value={v.imagen_url}
          onChange={(e) =>
            setV((prev) => ({ ...prev, imagen_url: e.target.value }))
          }
          className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
          placeholder="https://ejemplo.com/imagen-cancha.jpg"
        />
        {v.imagen_url && (
          <p className="text-xs text-gray-400 mt-1">
            Más adelante podés cambiar esto por un uploader de imágenes.
          </p>
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

      {erroresExternos.general && (
        <p className="text-red-400 text-sm">{erroresExternos.general}</p>
      )}

      <Button
        type="submit"
        disabled={loading}
        texto={loading ? "Guardando..." : submitText}
        variant="crear"
        size="pill"
        className="w-full"
      />
    </form>
  );
}
