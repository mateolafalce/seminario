// src/utils/permissions.js

export const FEATURES = {
  USUARIOS: 'usuarios',
  CANCHAS: 'canchas',
  RESERVAS: 'reservas',
  ESTADISTICAS: 'estadisticas',
};

// Roles
export const hasRole = (me, ...names) => names.some(n => (me?.roles || []).includes(n));

// Permisos con comodines (usuario puede tener 'foo.*')
export const hasPerm = (me, ...perms) => {
  const got = me?.permissions || [];
  if (got.includes('*')) return true;

  return perms.some(req => {
    if (got.includes(req)) return true;
    // usuario tiene 'prefix.*'
    const okByUserWildcard = got.some(g => g.endsWith('.*') && req.startsWith(g.slice(0, -1))); // mantiene el '.'
    if (okByUserWildcard) return true;

    // si se pide 'prefix.*', alcanza con que el usuario tenga 'prefix.algo'
    if (req.endsWith('.*')) {
      const prefixDot = req.slice(0, -1); // 'reservas.*' -> 'reservas.'
      return got.some(g => g === req || g.startsWith(prefixDot));
    }
    return false;
  });
};

// Políticas de UI (ajusta a tu gusto)
export const canManageUsers    = (me) => hasRole(me, 'admin'); // solo admin
export const canManageCanchas  = (me) => hasRole(me, 'admin', 'empleado') || hasPerm(me, 'canchas.*');
export const canManageReservas = (me) => hasRole(me, 'admin', 'empleado') || hasPerm(me, 'reservas.*');
export const canViewStatistics = (me) => hasRole(me, 'admin') || hasPerm(me, 'stats.ver');

// Aliases
export const canManageSpaces  = canManageCanchas;
export const canManageClients = canManageUsers;
export const canAccessAdmin   = canManageReservas;
