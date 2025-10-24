// src/utils/permissions.js

// Nombres “canónicos” de features (tabs/secciones)
export const FEATURES = {
  USUARIOS: 'usuarios',
  CANCHAS: 'canchas',
  RESERVAS: 'reservas',
  ESTADISTICAS: 'estadisticas',
};

// Helpers súper simples por rol:
export const canManageUsers        = (isAdmin, isEmpleado) => !!isAdmin;                 // solo admin
export const canManageCanchas      = (isAdmin, isEmpleado) => !!isAdmin || !!isEmpleado; // admin o empleado
export const canManageReservas     = (isAdmin, isEmpleado) => !!isAdmin || !!isEmpleado; // admin o empleado
export const canViewStatistics     = (isAdmin, isEmpleado) => !!isAdmin;                 // solo admin

// Aliases por compatibilidad (si los usabas)
export const canManageSpaces  = canManageCanchas;
export const canManageClients = canManageUsers;
export const canAccessAdmin   = canManageReservas;
