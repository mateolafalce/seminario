// 0 = lunes ... 6 = domingo (tu modelo)
function getWeekdayLunesCero(date) {
  // JS: 0=domingo, 1=lunes...6=sábado
  const js = date.getDay();
  return (js + 6) % 7; // 0=lunes ... 6=domingo
}

/**
 * Determina si una cancha está disponible para reservas en una fecha específica.
 * 
 * @param {Object} cancha - Objeto cancha con dias_semana y fechas_bloqueadas
 * @param {string} fechaISO - Fecha en formato "YYYY-MM-DD"
 * @returns {boolean} true si la cancha está disponible, false si está bloqueada
 */
export function isCanchaDisponibleEnFecha(cancha, fechaISO) {
  if (!fechaISO) return true; // por si acaso

  const [year, month, day] = fechaISO.split("-").map(Number);
  const fecha = new Date(year, month - 1, day);

  const weekday = getWeekdayLunesCero(fecha);

  // 1) chequeo dias_semana
  const dias = cancha.dias_semana;
  if (Array.isArray(dias) && dias.length > 0 && !dias.includes(weekday)) {
    return false;
  }

  // 2) chequeo fechas_bloqueadas (formato "DD-MM-YYYY")
  const dd = day.toString().padStart(2, "0");
  const mm = month.toString().padStart(2, "0");
  const fechaCanon = `${dd}-${mm}-${year}`;

  if (
    Array.isArray(cancha.fechas_bloqueadas) &&
    cancha.fechas_bloqueadas.includes(fechaCanon)
  ) {
    return false;
  }

  return true;
}
