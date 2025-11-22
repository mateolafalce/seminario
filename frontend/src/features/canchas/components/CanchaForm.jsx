import { useState } from "react";
import Button from "../../../shared/components/ui/Button/Button";

// default estable
const defaultValues = { nombre: "", horarios: [] };

export default function CanchaForm({
  initialValues = defaultValues,
  onSubmit,
  submitText = "Guardar",
  loading = false,
  erroresExternos = {},
  // lista de horarios disponibles [{ id, hora }]
  horariosOptions = [],
}) {
  const [v, setV] = useState(() => ({
    ...defaultValues,
    ...initialValues,
    horarios: Array.isArray(initialValues.horarios)
      ? initialValues.horarios.map(String)
      : [],
  }));

  const toggleHorario = (rawId) => {
    const id = String(rawId);
    setV((prev) => {
      const current = Array.isArray(prev.horarios)
        ? prev.horarios.map(String)
        : [];
      if (current.includes(id)) {
        return { ...prev, horarios: current.filter((hid) => hid !== id) };
      }
      return { ...prev, horarios: [...current, id] };
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const nombre = (v.nombre || "").trim();
    if (!nombre) {
      return setV((prev) => ({
        ...prev,
        _localErrorNombre: "El nombre es obligatorio",
      }));
    }

    const horarios = Array.isArray(v.horarios)
      ? v.horarios.map(String)
      : [];

    await onSubmit?.({ nombre, horarios });
  }

  const horariosSeleccionados = Array.isArray(v.horarios)
    ? v.horarios.map(String)
    : [];

  const errorNombre =
    v._localErrorNombre || erroresExternos.nombre || null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nombre */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">Nombre</label>
        <input
          type="text"
          value={v.nombre}
          onChange={(e) =>
            setV((prev) => ({
              ...prev,
              nombre: e.target.value,
              _localErrorNombre: null,
            }))
          }
          className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white focus:outline-none"
          placeholder="Ej: Cancha 1"
          required
        />
        {errorNombre && (
          <p className="text-red-400 text-sm mt-1">{errorNombre}</p>
        )}
      </div>

      {/* Horarios por cancha (si hay opciones) */}
      {Array.isArray(horariosOptions) && horariosOptions.length > 0 && (
        <div>
          <label className="block text-sm text-gray-300 mb-1">
            Horarios habilitados para esta cancha
          </label>
          <div className="max-h-48 overflow-y-auto border border-gray-700 rounded-lg p-2 bg-gray-900/60">
            <div className="flex flex-wrap gap-2">
              {horariosOptions.map((h) => {
                const id = String(h.id || h._id || h.hora);
                const label = h.hora || String(h);
                const checked = horariosSeleccionados.includes(id);

                return (
                  <label
                    key={id}
                    className={`flex items-center gap-1 text-xs text-gray-200 px-2 py-1 rounded-md border cursor-pointer ${
                      checked
                        ? "bg-lime-500/20 border-lime-400"
                        : "bg-gray-900/70 border-gray-700 hover:bg-gray-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-lime-400"
                      checked={checked}
                      onChange={() => toggleHorario(id)}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          {erroresExternos.horarios && (
            <p className="text-red-400 text-sm mt-1">
              {erroresExternos.horarios}
            </p>
          )}
        </div>
      )}

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
