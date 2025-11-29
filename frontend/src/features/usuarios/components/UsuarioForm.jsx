import { useEffect, useState } from "react";
import useCategorias from "../../../shared/hooks/useCategorias";
import { onlyDigits, validateNewUser } from "../../../shared/utils/userValidation";
import Button from "../../../shared/components/ui/Button/Button";

export default function UsuarioForm({
  initialValues = { nombre:"", apellido:"", email:"", categoria:"", habilitado:false },
  onSubmit,
  submitText = "Guardar",
  loading = false,
  errores = {},
  mode = "edit",
  showAuthFields,
}) {
  const [v, setV] = useState({
    ...initialValues,
    username: initialValues.username || "",
    password: "",
    repeatPassword: "",
    dni: initialValues.dni || "",
    telefono: initialValues.telefono || "",
  });
  const [localErrors, setLocalErrors] = useState({});
  const { nombres: categoriasNombres, loading: loadingCategorias } = useCategorias();

  const isCreate = (showAuthFields ?? (mode === "create"));

  // Sincronizar valores al editar
  useEffect(() => {
    if (mode === "edit" && initialValues && initialValues.id != null) {
      setV(prev => ({
        ...prev,
        ...initialValues,
        username: initialValues.username || "",
        password: "", // Al editar no precargamos password
        repeatPassword: "",
        dni: initialValues.dni || "",
        telefono: initialValues.telefono || "",
      }));
      setLocalErrors({});
    }
  }, [mode, initialValues]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setV(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function handleDniChange(e) {
    const clean = onlyDigits(e.target.value).slice(0, 10);
    setV(prev => ({ ...prev, dni: clean }));
  }

  function handleTelefonoChange(e) {
    const clean = onlyDigits(e.target.value).slice(0, 20);
    setV(prev => ({ ...prev, telefono: clean }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validaciones locales
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

  const E = { ...localErrors, ...errores };
  
  // Estilos unificados
  const labelClass = "block text-sm text-gray-300 mb-1.5 font-medium";
  const inputClass = "w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all placeholder:text-gray-600";
  const errorClass = "text-red-400 text-xs mt-1 ml-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SECCIÓN: DATOS PERSONALES */}
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-5">
            <h3 className="text-white font-bold border-b border-slate-700 pb-2">Información Personal</h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Nombre</label>
                    <input
                        name="nombre"
                        value={v.nombre}
                        onChange={handleChange}
                        placeholder="Ej: Juan"
                        className={inputClass}
                    />
                    {E.nombre && <p className={errorClass}>{E.nombre}</p>}
                </div>
                <div>
                    <label className={labelClass}>Apellido</label>
                    <input
                        name="apellido"
                        value={v.apellido}
                        onChange={handleChange}
                        placeholder="Ej: Pérez"
                        className={inputClass}
                    />
                    {E.apellido && <p className={errorClass}>{E.apellido}</p>}
                </div>
            </div>

            <div>
                <label className={labelClass}>Email</label>
                <input
                    name="email"
                    type="email"
                    value={v.email}
                    onChange={handleChange}
                    placeholder="correo@ejemplo.com"
                    className={inputClass}
                />
                {E.email && <p className={errorClass}>{E.email}</p>}
            </div>

            <div>
                <label className={labelClass}>DNI</label>
                <input
                    name="dni"
                    type="text"
                    value={v.dni}
                    onChange={handleDniChange}
                    placeholder="Solo números"
                    inputMode="numeric"
                    className={inputClass}
                />
                {E.dni && <p className={errorClass}>{E.dni}</p>}
            </div>

            <div>
                <label className={labelClass}>Teléfono</label>
                <input
                    name="telefono"
                    type="text"
                    value={v.telefono}
                    onChange={handleTelefonoChange}
                    placeholder="Solo números"
                    inputMode="numeric"
                    className={inputClass}
                />
                {E.telefono && <p className={errorClass}>{E.telefono}</p>}
            </div>
        </div>

        {/* SECCIÓN: CUENTA Y ACCESO */}
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-5">
            <h3 className="text-white font-bold border-b border-slate-700 pb-2">Configuración de Cuenta</h3>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Nombre de Usuario</label>
                    <input
                        name="username"
                        value={v.username}
                        onChange={handleChange}
                        placeholder="usuario123"
                        disabled={!isCreate} // Username suele ser inmutable al editar
                        className={`${inputClass} ${!isCreate ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    {E.username && <p className={errorClass}>{E.username}</p>}
                </div>
                <div>
                    <label className={labelClass}>Categoría</label>
                    <select
                        name="categoria"
                        value={v.categoria || ""}
                        onChange={handleChange}
                        className={inputClass}
                    >
                        <option value="">{loadingCategorias ? "Cargando..." : "Sin categoría"}</option>
                        {categoriasNombres.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
            </div>

            {isCreate && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Contraseña</label>
                        <input
                            name="password"
                            type="password"
                            value={v.password}
                            onChange={handleChange}
                            placeholder="******"
                            className={inputClass}
                        />
                        {E.password && <p className={errorClass}>{E.password}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>Repetir Contraseña</label>
                        <input
                            name="repeatPassword"
                            type="password"
                            value={v.repeatPassword}
                            onChange={handleChange}
                            placeholder="******"
                            className={inputClass}
                        />
                        {E.repeatPassword && <p className={errorClass}>{E.repeatPassword}</p>}
                    </div>
                </div>
            )}

            {/* Switch Habilitado */}
            <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                        <input
                            type="checkbox"
                            name="habilitado"
                            checked={!!v.habilitado}
                            onChange={handleChange}
                            className="sr-only"
                        />
                        <div className={`w-10 h-6 rounded-full transition-colors ${v.habilitado ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${v.habilitado ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                        {v.habilitado ? "Usuario Habilitado" : "Pendiente de verificación de email"}
                    </span>
                </label>
            </div>
        </div>
      </div>

      {E.general && (
        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm text-center">
            {E.general}
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-slate-700">
        <Button
          type="submit"
          disabled={loading}
          texto={loading ? "Guardando..." : submitText}
          variant="default"
          size="lg"
          className="w-full sm:w-auto px-12"
        />
      </div>
    </form>
  );
}