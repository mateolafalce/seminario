// Ordena strings tipo "09:00-10:30", "9:00-10:30", etc, por la hora de inicio

export function parseHorarioInicioEnMinutos(horario) {
  if (!horario || typeof horario !== "string") return Number.POSITIVE_INFINITY;

  // Tomamos solo la parte inicial "HH:MM"
  const [inicio] = horario.split("-");
  if (!inicio) return Number.POSITIVE_INFINITY;

  const [hhStr, mmStr = "0"] = inicio.trim().split(":");
  const hh = parseInt(hhStr, 10);
  const mm = parseInt(mmStr, 10);

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
    return Number.POSITIVE_INFINITY;
  }

  return hh * 60 + mm;
}

/**
 * Devuelve una NUEVA lista de horarios ordenada por hora de inicio.
 * No muta el array original.
 */
export function ordenarHorarios(lista) {
  if (!Array.isArray(lista)) return [];
  return [...lista].sort((a, b) => {
    const ma = parseHorarioInicioEnMinutos(a);
    const mb = parseHorarioInicioEnMinutos(b);
    if (ma === mb) {
      // Si empatan en minutos, usamos orden alfabético para ser deterministas
      return String(a).localeCompare(String(b));
    }
    return ma - mb;
  });
}
