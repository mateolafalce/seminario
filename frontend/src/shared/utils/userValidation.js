export const onlyDigits = (s) => (s || "").replace(/\D+/g, "");

// === Validaciones ===
// Defaults iguales a tu Register actual (mínimos relajados):
export function validateNewUser(values, opts = {}) {
  const {
    minUsername = 1,
    minPassword = 1,
    dniMin = 1,
    dniMax = 10,
  } = opts;

  const v = values || {};
  const errors = {};
  const dni = onlyDigits(v.dni);

  if (!v.nombre?.trim()) errors.nombre = "Requerido";
  if (!v.apellido?.trim()) errors.apellido = "Requerido";
  if (!v.email?.trim()) errors.email = "Requerido";

  if (!v.username || v.username.length < minUsername)
    errors.username = minUsername === 1 ? "Requerido" : `Mínimo ${minUsername} caracteres`;

  if (!v.password || v.password.length < minPassword)
    errors.password = minPassword === 1 ? "Requerido" : `Mínimo ${minPassword} caracteres`;

  if (v.password !== v.repeatPassword)
    errors.repeatPassword = "Las contraseñas no coinciden";

  if (dni.length < dniMin || dni.length > dniMax)
    errors.dni = `DNI inválido: ${dniMin} a ${dniMax} dígitos`;

  return errors;
}

// === Mapeo de errores de API (422 Pydantic etc.) ===
export const fromPydantic422 = (detail) => {
  const errores = {};
  if (Array.isArray(detail)) {
    for (const d of detail) {
      const field = Array.isArray(d.loc) ? d.loc.at(-1) : d.loc;
      if (field) errores[field] = d.msg || "Valor inválido";
    }
  } else if (typeof detail === "string") {
    errores.general = detail;
  }
  return errores;
};

export const normalizeApiError = async (error) => {
  const data = error?.response?.data || error?.data || {};
  if (data.detail) return fromPydantic422(data.detail);
  if (typeof data === "string") return { general: data };
  if (error?.message) return { general: error.message };
  return { general: "Error desconocido" };
};
