// Permisos simples por rol. Ajusta a tu gusto.
const roleMap = {
  super:        ['usuarios', 'canchas', 'reservas', 'estadisticas'],
  gerente:      ['usuarios', 'canchas', 'reservas', 'estadisticas'],
  empleado:     ['canchas', 'reservas'],
  // agrega más si lo necesitás
};

function has(feature, isAdmin, tipoAdmin) {
  if (!isAdmin) return false;
  if (!tipoAdmin) return true; // si no tenés tipado de admin, dejamos pasar
  const key = String(tipoAdmin).toLowerCase();
  const feats = roleMap[key] || [];
  return feats.includes(feature);
}

export const canManageUsers        = (isAdmin, tipoAdmin) => has('usuarios', isAdmin, tipoAdmin);
export const canManageCanchas      = (isAdmin, tipoAdmin) => has('canchas', isAdmin, tipoAdmin);
export const canManageReservas     = (isAdmin, tipoAdmin) => has('reservas', isAdmin, tipoAdmin);
export const canViewStatistics     = (isAdmin, tipoAdmin) => has('estadisticas', isAdmin, tipoAdmin);

// Compat con nombres de tu snippet original (si querés reutilizar)
export const canManageSpaces       = canManageCanchas;
export const canManageClients      = canManageUsers;
export const canAccessAdmin        = canManageReservas;
