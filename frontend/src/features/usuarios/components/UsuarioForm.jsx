import React, { useEffect, useState } from "react";
import useCategorias from "../../../shared/hooks/useCategorias";
import { onlyDigits, validateNewUser } from "../../../shared/utils/userValidation";

export default function UsuarioForm({
  initialValues = { nombre:"", apellido:"", email:"", categoria:"", habilitado:false },
  onSubmit,
  onCancel,
  submitText = "Guardar",
  loading = false,
  errores = {},              // errores externos (API)
  mode = "edit",             // "create" | "edit"
  showAuthFields,
}) {
  const [v, setV] = useState({
    ...initialValues,
    username: initialValues.username || "",
    password: "",
    repeatPassword: "",
    dni: initialValues.dni || "",
  });
  const [localErrors, setLocalErrors] = useState({});
  const { nombres: categoriasNombres, loading: loadingCategorias } = useCategorias();

  const isCreate = (showAuthFields ?? (mode === "create"));

  // 🔒 Solo sincronizar initialValues cuando EDITAMOS y cambia el id
  useEffect(() => {
    if (mode === "edit" && initialValues && initialValues.id != null) {
      setV(prev => ({
        ...prev,
        ...initialValues,
        username: initialValues.username || "",
        password: "",
        repeatPassword: "",
        dni: initialValues.dni || "",
      }));
      setLocalErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialValues?.id]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setV(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function handleDniChange(e) {
    const clean = onlyDigits(e.target.value).slice(0, 10);
    setV(prev => ({ ...prev, dni: clean }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validaciones
    if (isCreate) {
      const errs = validateNewUser(v, { minUsername: 1, minPassword: 1, dniMin: 1, dniMax: 10 });
      setLocalErrors(errs);
      if (Object.keys(errs).length) return;
    } else {
      const errs = {};
      if (!v.nombre?.trim()) errs.nombre = "Requerido";
      if (!v.apellido?.trim()) errs.apellido = "Requerido";
      if (!v.email?.trim()) errs.email = "Requerido";
      setLocalErrors(errs);
      if (Object.keys(errs).length) return;
    }

    await onSubmit?.(v);
  }

  const E = { ...localErrors, ...errores }; // merge errores locales + backend

  const inputBase = "w-full px-3 py-2 rounded-lg border bg-gray-800 text-white";
  const ok = "border-gray-600";
  const bad = "border-red-500 focus:ring-red-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <input
            name="nombre"
            value={v.nombre}
            onChange={handleChange}
            placeholder="Nombre"
            className={`${inputBase} ${E.nombre ? bad : ok}`}
            required
          />
          {E.nombre && <p className="text-red-400 text-xs mt-1">{E.nombre}</p>}
        </div>

        <div>
          <input
            name="apellido"
            value={v.apellido}
            onChange={handleChange}
            placeholder="Apellido"
            className={`${inputBase} ${E.apellido ? bad : ok}`}
            required
          />
          {E.apellido && <p className="text-red-400 text-xs mt-1">{E.apellido}</p>}
        </div>

        <div>
          <input
            name="email"
            type="email"
            value={v.email}
            onChange={handleChange}
            placeholder="Email"
            className={`${inputBase} ${E.email ? bad : ok}`}
            required
          />
          {E.email && <p className="text-red-400 text-xs mt-1">{E.email}</p>}
        </div>

        <div>
          <select
            name="categoria"
            value={v.categoria || ""}
            onChange={handleChange}
            className={`${inputBase} ${ok}`}
          >
            <option value="">{loadingCategorias ? "Cargando…" : "Sin categoría"}</option>
            {categoriasNombres.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {isCreate && (
          <>
            <div>
              <input
                name="username"
                value={v.username}
                onChange={handleChange}
                placeholder="Nombre de usuario"
                autoComplete="username"
                minLength={1}
                maxLength={30}
                className={`${inputBase} ${E.username ? bad : ok}`}
                required
              />
              {E.username && <p className="text-red-400 text-xs mt-1">{E.username}</p>}
            </div>

            <div>
              <input
                name="password"
                type="password"
                value={v.password}
                onChange={handleChange}
                placeholder="Contraseña"
                autoComplete="new-password"
                minLength={1}
                className={`${inputBase} ${E.password ? bad : ok}`}
                required
              />
              {E.password && <p className="text-red-400 text-xs mt-1">{E.password}</p>}
            </div>

            <div>
              <input
                name="repeatPassword"
                type="password"
                value={v.repeatPassword}
                onChange={handleChange}
                placeholder="Repetir contraseña"
                autoComplete="new-password"
                minLength={1}
                className={`${inputBase} ${E.repeatPassword ? bad : ok}`}
                required
              />
              {E.repeatPassword && <p className="text-red-400 text-xs mt-1">{E.repeatPassword}</p>}
            </div>

            <div>
              <input
                name="dni"
                type="text"
                value={v.dni}
                onChange={handleDniChange}
                placeholder="DNI (1–10 dígitos)"
                inputMode="numeric"
                maxLength={10}
                className={`${inputBase} ${E.dni ? bad : ok}`}
                required
              />
              {E.dni && <p className="text-red-400 text-xs mt-1">{E.dni}</p>}
            </div>
          </>
        )}
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="habilitado"
          checked={!!v.habilitado}
          onChange={handleChange}
          className="accent-[#E5FF00]"
        />
        <span className="text-white text-sm">Usuario habilitado</span>
      </label>

      {E.general && <p className="text-red-400 text-sm">{E.general}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[#E5FF00] text-gray-900 rounded-lg disabled:opacity-60"
        >
          {loading ? "Guardando..." : submitText}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
