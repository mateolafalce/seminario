import React, { useEffect, useState } from "react";
import useCategorias from "../../../hooks/useCategorias";

export default function UsuarioForm({
  initialValues = { nombre:"", apellido:"", email:"", categoria:"", habilitado:false },
  onSubmit,
  onCancel,
  submitText = "Guardar",
  loading = false,
  errores = {}
}) {
  const [v, setV] = useState(initialValues);
  const { nombres: categoriasNombres, loading: loadingCategorias } = useCategorias();

  useEffect(() => { setV(initialValues); }, [initialValues]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setV(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!v.nombre?.trim() || !v.apellido?.trim() || !v.email?.trim()) return;
    await onSubmit?.(v);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input name="nombre" value={v.nombre} onChange={handleChange}
          placeholder="Nombre"
          className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white" required />
        <input name="apellido" value={v.apellido} onChange={handleChange}
          placeholder="Apellido"
          className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white" required />
        <input name="email" type="email" value={v.email} onChange={handleChange}
          placeholder="Email"
          className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white" required />
        <select name="categoria" value={v.categoria || ""} onChange={handleChange}
          className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white">
          <option value="">{loadingCategorias ? "Cargando…" : "Sin categoría"}</option>
          {categoriasNombres.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="habilitado" checked={!!v.habilitado} onChange={handleChange} className="accent-[#E5FF00]" />
        <span className="text-white text-sm">Usuario habilitado</span>
      </label>

      {errores.general && <p className="text-red-400 text-sm">{errores.general}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-[#E5FF00] text-gray-900 rounded-lg disabled:opacity-60">
          {loading ? "Guardando..." : submitText}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
