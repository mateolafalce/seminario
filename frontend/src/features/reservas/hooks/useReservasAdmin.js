import { useEffect, useMemo, useState } from "react";
import adminApi from "../../../shared/services/adminApi";
import { toast } from "react-toastify";

// Utiles de fecha (los mismos que tenías en GestionReservas)
const isoToDMY = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
};

const ensureYMD = (raw) => {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [mm, dd, yyyy] = raw.split("/");
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [dd, mm, yyyy] = raw.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  return raw;
};

export default function useReservasAdmin() {
  const [fechaISO, setFechaISO] = useState("");
  const [cancha, setCancha] = useState("");
  const [usuario, setUsuario] = useState("");

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total]
  );

  const [loading, setLoading] = useState(false);

  const fetchData = async (goToPage = page) => {
    try {
      setLoading(true);
      const fechaDMY = fechaISO ? isoToDMY(ensureYMD(fechaISO)) : undefined;

      const resp = await adminApi.reservas.adminSearch({
        fecha: fechaDMY,
        cancha: cancha.trim() || undefined,
        usuario: usuario.trim() || undefined,
        page: goToPage,
        limit,
      });

      setRows(resp?.reservas || []);
      setTotal(resp?.total || (resp?.reservas?.length ?? 0));
      setPage(resp?.page || goToPage);
    } catch (e) {
      // ❌ Nada de JSX aquí
      toast.error(e.message || "Error cargando reservas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onBuscar = async (e) => {
    e?.preventDefault();
    await fetchData(1);
  };

  const onLimpiar = async () => {
    setFechaISO("");
    setCancha("");
    setUsuario("");
    await fetchData(1);
  };

  return {
    fechaISO,
    setFechaISO,
    cancha,
    setCancha,
    usuario,
    setUsuario,
    rows,
    page,
    totalPages,
    fetchData,
    onBuscar,
    onLimpiar,
    loading,
  };
}