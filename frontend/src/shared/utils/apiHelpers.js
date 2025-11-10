import React from 'react';
import { toast } from 'react-toastify';
import MiToast from '../components/ui/Toast/MiToast';

/**
 * Maneja respuestas HTTP de forma segura
 */
export const handleResponse = async (response) => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { detail: response.statusText };
    }
    const error = new Error(errorData.detail || 'Ocurrió un error en la petición.');
    error.response = response;
    error.data = errorData;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

/**
 * Parsea JSON de forma segura
 */
export const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

/**
 * Muestra un toast de forma segura (sin JSX)
 */
export const safeToast = (message, color = '#FFC107') => {
  toast(React.createElement(MiToast, { mensaje: message, color }));
};

/**
 * Muestra toast de error
 */
export const errorToast = (message) => {
  safeToast(message, '#ef4444');
};

/**
 * Muestra toast de éxito
 */
export const successToast = (message) => {
  safeToast(message, '#10b981');
};

/**
 * Formatea fecha a formato local
 */
export const formatDate = (isoString) => {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleDateString('es-AR');
};

/**
 * Formatea fecha y hora a formato local 24hs
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  return date.toLocaleString('es-AR', options).replace(',', '');
};

/**
 * Combina clases CSS de forma condicional
 */
export const cn = (...classes) => classes.filter(Boolean).join(' ');
