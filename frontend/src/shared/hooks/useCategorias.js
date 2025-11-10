import { useEffect, useMemo, useState } from 'react';
import categoriasApi from '../services/categoriasApi';
import { errorToast } from '../utils/apiHelpers';

export default function useCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await categoriasApi.listar();
        if (!alive) return;
        setCategorias(Array.isArray(data) ? data : []);
      } catch {
        errorToast('No se pudieron cargar las categorías');
        setCategorias([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const nombres = useMemo(() => categorias.map(c => c.nombre), [categorias]);
  const porNombre = useMemo(() => {
    const m = new Map();
    categorias.forEach(c => m.set(c.nombre, c));
    return m;
  }, [categorias]);

  return { categorias, nombres, porNombre, loading };
}
