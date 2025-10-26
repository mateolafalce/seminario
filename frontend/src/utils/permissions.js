export const FEATURES = {
  USUARIOS: 'usuarios',
  CANCHAS: 'canchas',
  RESERVAS: 'reservas',
  ESTADISTICAS: 'estadisticas',
};

// Roles
export const hasRole = (me, ...names) =>
  names.some(n => (me?.roles || []).includes(n));

// Normaliza perms a array de strings
const _asArray = (v) => Array.isArray(v) ? v : (v ? [v] : []);

// Permisos con comodines (usuario puede tener '*', 'foo.*' o exacto)
export const hasPerm = (me, ...perms) => {
  const got = _asArray(me?.permissions);
  if (got.includes('*')) return true;

  return perms.some(req => {
    if (!req) return true;                // por si alguien llama hasPerm(me)
    if (got.includes(req)) return true;   // exacto

    // usuario tiene 'prefix.*'
    const okByUserWildcard = got.some(g => g.endsWith('.*') && req.startsWith(g.slice(0, -1)));
    if (okByUserWildcard) return true;

    // si se pide 'prefix.*', alcanza con que el usuario tenga 'prefix.algo'
    if (req.endsWith('.*')) {
      const prefixDot = req.slice(0, -1); // 'reservas.*' -> 'reservas.'
      return got.some(g => g === req || g.startsWith(prefixDot));
    }
    return false;
  });
};

// Políticas de UI (ajusta a gusto)
export const canManageUsers       = (me) => hasRole(me, 'admin');
export const canManageCanchas     = (me) => hasRole(me, 'admin', 'empleado') || hasPerm(me, 'canchas.*');
export const canManageReservas    = (me) => hasRole(me, 'admin', 'empleado') || hasPerm(me, 'reservas.*');
export const canManageHorarios    = (me) => hasRole(me, 'admin', 'empleado') || hasPerm(me, 'horarios.*');
export const canManageCategorias  = (me) => hasRole(me, 'admin', 'empleado') || hasPerm(me, 'categorias.*');
export const canViewStatistics    = (me) => hasRole(me, 'admin') || hasPerm(me, 'stats.ver');
export const canUseAlgoritmo      = (me) => hasRole(me, 'admin') || hasPerm(me, 'algoritmo.*');

// Aliases (si los necesitás)
export const canManageSpaces  = canManageCanchas;
export const canManageClients = canManageUsers;
export const canAccessAdmin   = canManageReservas;
