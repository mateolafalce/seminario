import React, { useEffect, useState } from "react";

export default function CanchaForm({
  initialValues = { nombre: "" },
  onSubmit,
  submitText = "Guardar",
  loading = false,
  erroresExternos = {},
}) {
  const [v, setV] = useState(initialValues);
  const [errs, setErrs] = useState({});
  useEffect(() => setV(initialValues), [initialValues]);

  async function handleSubmit(e) {
    e.preventDefault();
    const nombre = (v.nombre || "").trim();
    if (!nombre) return setErrs({ nombre: "El nombre es obligatorio" });
    setErrs({});
    await onSubmit?.({ nombre });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm text-gray-300 mb-1">Nombre</label>
        <input
          type="text"
          value={v.nombre}
          onChange={(e) => setV({ ...v, nombre: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white focus:outline-none"
          placeholder="Ej: Cancha 1"
          required
        />
        {(errs.nombre || erroresExternos.nombre) && (
          <p className="text-red-400 text-sm mt-1">{errs.nombre || erroresExternos.nombre}</p>
        )}
      </div>

      {erroresExternos.general && <p className="text-red-400 text-sm">{erroresExternos.general}</p>}

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-[#E5FF00] text-gray-900 rounded-lg disabled:opacity-60"
      >
        {loading ? "Guardando..." : submitText}
      </button>
    </form>
  );
}
