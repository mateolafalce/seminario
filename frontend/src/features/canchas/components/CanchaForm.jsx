import { useEffect, useState } from "react";
import Button from "../../../shared/components/ui/Button/Button";
import backendClient from "../../../shared/services/backendClient";
import adminApi from "../../../shared/services/adminApi";
import { FiUpload, FiTrash2, FiImage } from "react-icons/fi";
import { getFileUrl } from "../../../app/config";

const DIAS_SEMANA = [
  { value: 0, label: "Lunes" },
  { value: 1, label: "Martes" },
  { value: 2, label: "Miércoles" },
  { value: 3, label: "Jueves" },
  { value: 4, label: "Viernes" },
  { value: 5, label: "Sábado" },
  { value: 6, label: "Domingo" },
];

const defaultValues = {
  nombre: "",
  descripcion: "",
  imagen_url: "",
  imagenes: [],
  habilitada: true,
  horarios: [],
  // 🔴 NUEVO
  capacidad_maxima: 6,
  dias_semana: [0, 1, 2, 3, 4, 5, 6],
  fechas_bloqueadas: [],
};

export default function CanchaForm({
  initialValues = defaultValues,
  onSubmit,
  submitText = "Guardar",
  loading = false,
  erroresExternos = {},
}) {
  const [v, setV] = useState(() => {
    const init = initialValues || {};
    return {
      ...defaultValues,
      ...init,
      imagenes: init.imagenes || [],
      // normalizar por si vienen como strings
      dias_semana: Array.isArray(init.dias_semana) && init.dias_semana.length
        ? init.dias_semana.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6)
        : defaultValues.dias_semana,
      fechas_bloqueadas: Array.isArray(init.fechas_bloqueadas)
        ? init.fechas_bloqueadas
        : [],
    };
  });

  // Si cambian los initialValues (ej: cuando cargás una cancha para editar),
  // sincronizamos el formulario
  useEffect(() => {
    setV({
      ...defaultValues,
      ...initialValues,
      imagenes: initialValues.imagenes || [],
    });
  }, [initialValues]);

  const [errs, setErrs] = useState({});
  const [uploading, setUploading] = useState(false);
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(true);
  const [fechaBloqInput, setFechaBloqInput] = useState("");

  useEffect(() => {
    let cancelado = false;
    const cargarHorarios = async () => {
      try {
        setCargandoHorarios(true);
        const data = await adminApi.horarios.listNormalized();
        if (!cancelado) setHorariosDisponibles(data || []);
      } catch (e) {
        if (!cancelado) setHorariosDisponibles([]);
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
      return {
        ...prev,
        horarios: actuales.includes(id)
          ? actuales.filter((h) => h !== id)
          : [...actuales, id],
      };
    });
  };

  const toggleDiaSemana = (diaValue) => {
    setV((prev) => {
      const actuales = Array.isArray(prev.dias_semana) ? prev.dias_semana : [];
      const yaEsta = actuales.includes(diaValue);
      const nueva = yaEsta
        ? actuales.filter((d) => d !== diaValue)
        : [...actuales, diaValue];
      return {
        ...prev,
        dias_semana: nueva.sort((a, b) => a - b),
      };
    });
  };

  const handleAgregarFechaBloqueada = () => {
    if (!fechaBloqInput) return;
    const [yyyy, mm, dd] = fechaBloqInput.split("-");
    if (!yyyy || !mm || !dd) return;
    const ddmmyyyy = `${dd}-${mm}-${yyyy}`;
    setV((prev) => {
      const existentes = prev.fechas_bloqueadas || [];
      if (existentes.includes(ddmmyyyy)) return prev;
      return {
        ...prev,
        fechas_bloqueadas: [...existentes, ddmmyyyy],
      };
    });
    setFechaBloqInput("");
  };

  const removeFechaBloqueada = (index) => {
    setV((prev) => ({
      ...prev,
      fechas_bloqueadas: prev.fechas_bloqueadas.filter((_, i) => i !== index),
    }));
  };

  // Subida de imagen (genérico)
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("archivo", file);
    const resp = await backendClient.post("canchas/subir-imagen", formData);
    // resp.url es algo como "/images/cancha_123.jpg"
    return resp.url;
  };

  // Handler para Portada
  const handlePortadaChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadFile(file);
      setV((p) => ({ ...p, imagen_url: url }));
    } catch (error) {
      alert("Error subiendo portada");
    } finally {
      setUploading(false);
    }
  };

  // Handler para Secundarias
  const handleSecundariaChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadFile(file);
      setV((p) => ({ ...p, imagenes: [...(p.imagenes || []), url] }));
    } catch (error) {
      alert("Error subiendo imagen secundaria");
    } finally {
      setUploading(false);
    }
  };

  const removeSecundaria = (index) => {
    setV((p) => ({
      ...p,
      imagenes: p.imagenes.filter((_, i) => i !== index),
    }));
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
      imagenes: v.imagenes || [],
      habilitada: !!v.habilitada,
      horarios: Array.isArray(v.horarios) ? v.horarios : [],
      // 🔴 NUEVOS CAMPOS
      capacidad_maxima:
        v.capacidad_maxima && Number(v.capacidad_maxima) > 0
          ? Number(v.capacidad_maxima)
          : 6,
      dias_semana:
        Array.isArray(v.dias_semana) && v.dias_semana.length
          ? v.dias_semana
          : undefined,
      fechas_bloqueadas: Array.isArray(v.fechas_bloqueadas)
        ? v.fechas_bloqueadas
        : [],
    };

    await onSubmit?.(payload);
  }

  const errorNombre = errs.nombre || erroresExternos.nombre;

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* COLUMNA IZQUIERDA: DATOS */}
      <div className="space-y-6">
        <div className="space-y-4 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <h3 className="text-white font-bold border-b border-slate-700 pb-2">
            Información General
          </h3>

          <div>
            <label className="block text-sm text-gray-300 mb-1.5 font-medium">
              Nombre de la Cancha
            </label>
            <input
              type="text"
              value={v.nombre}
              onChange={(e) =>
                setV((prev) => ({ ...prev, nombre: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
              placeholder="Ej: Cancha Central"
              required
            />
            {errorNombre && (
              <p className="text-red-400 text-sm mt-1">{errorNombre}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1.5 font-medium">
              Descripción Detallada
            </label>
            <textarea
              value={v.descripcion}
              onChange={(e) =>
                setV((prev) => ({ ...prev, descripcion: e.target.value }))
              }
              rows={6}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/70 resize-none leading-relaxed"
              placeholder="Describe el tipo de suelo, iluminación, si es techada..."
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
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
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  v.habilitada ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-gray-200">
              {v.habilitada
                ? "Habilitada para reservas"
                : "En mantenimiento (Deshabilitada)"}
            </span>
          </div>
        </div>

        {/* Horarios */}
        <div className="space-y-4 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <h3 className="text-white font-bold border-b border-slate-700 pb-2">
            Disponibilidad
          </h3>
          {cargandoHorarios ? (
            <p className="text-slate-400">Cargando...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {horariosDisponibles.map((h) => (
                <label
                  key={h.id}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                    v.horarios.includes(h.id)
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={v.horarios.includes(h.id)}
                    onChange={() => toggleHorario(h.id)}
                  />
                  <span className="text-sm font-mono">{h.hora}</span>
                </label>
              ))}
            </div>
          )}

          {/* 🔴 NUEVO: Capacidad, Días y Fechas bloqueadas */}
          <div className="mt-4 space-y-4 border-t border-slate-700 pt-4">
            {/* Capacidad */}
            <div>
              <label className="block text-sm text-gray-300 mb-1.5 font-medium">
                Capacidad máxima de jugadores
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={v.capacidad_maxima}
                onChange={(e) =>
                  setV((prev) => ({
                    ...prev,
                    capacidad_maxima: e.target.value,
                  }))
                }
                className="w-32 px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
              />
              <p className="text-xs text-gray-400 mt-1">
                Si no sabés, dejalo en 6. Se usa para limitar el cupo en cada
                horario.
              </p>
            </div>

            {/* Días de la semana */}
            <div>
              <label className="block text-sm text-gray-300 mb-1.5 font-medium">
                Días habilitados
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DIAS_SEMANA.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDiaSemana(d.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                      v.dias_semana.includes(d.value)
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Si desmarcás todos, se interpreta como sin restricción (todos los
                días).
              </p>
            </div>

            {/* Fechas bloqueadas */}
            <div>
              <label className="block text-sm text-gray-300 mb-1.5 font-medium">
                Fechas bloqueadas
              </label>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="date"
                  value={fechaBloqInput}
                  onChange={(e) => setFechaBloqInput(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  texto="Agregar"
                  onClick={handleAgregarFechaBloqueada}
                  disabled={!fechaBloqInput}
                />
              </div>
              {(!v.fechas_bloqueadas || v.fechas_bloqueadas.length === 0) ? (
                <p className="text-xs text-gray-500">
                  No hay fechas bloqueadas para esta cancha.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {v.fechas_bloqueadas.map((f, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-slate-900 border border-slate-600 text-xs text-gray-200"
                    >
                      {f}
                      <button
                        type="button"
                        onClick={() => removeFechaBloqueada(idx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* COLUMNA DERECHA: IMÁGENES */}
      <div className="space-y-6">
        {/* PORTADA */}
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <h3 className="text-white font-bold border-b border-slate-700 pb-2 mb-4">
            Imagen de Portada
          </h3>
          <div className="relative w-full h-48 bg-slate-900 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center overflow-hidden group hover:border-emerald-500/50 transition-colors">
            {v.imagen_url ? (
              <>
                <img
                  src={getFileUrl(v.imagen_url)}
                  alt="Portada"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-medium">
                    Cambiar Portada
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center p-4">
                <FiImage className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">
                  Subir imagen principal
                </p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handlePortadaChange}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* GALERÍA */}
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-4">
            <h3 className="text-white font-bold">Galería de Fotos</h3>
            <div className="relative overflow-hidden">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<FiUpload />}
                texto="Agregar"
                disabled={uploading}
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleSecundariaChange}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {!v.imagenes || v.imagenes.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm italic bg-slate-900/50 rounded-lg">
              No hay imágenes secundarias cargadas.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {v.imagenes.map((img, idx) => (
                <div
                  key={idx}
                  className="relative group aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-700"
                >
                  <img
                    src={getFileUrl(img)}
                    alt={`Galeria ${idx}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeSecundaria(idx)}
                    className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 pt-4 border-t border-slate-700 flex justify-end">
        <Button
          type="submit"
          disabled={loading || uploading}
          texto={loading ? "Guardando..." : submitText}
          variant="default"
          size="lg"
          className="w-full sm:w-auto px-12"
        />
      </div>
    </form>
  );
}
