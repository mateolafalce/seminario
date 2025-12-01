import { useEffect, useState, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion"; // <---
import { AuthContext } from "../../auth/context/AuthContext";
import backendClient from "../../../shared/services/backendClient";
import Button from "../../../shared/components/ui/Button/Button";
import { successToast, errorToast } from "../../../shared/utils/apiHelpers";
import MessageConfirm from "../../../shared/components/ui/Confirm/MessageConfirm";
import {
  FiTrash2,
  FiEdit2,
  FiPlus,
  FiSave,
  FiX,
  FiArrowLeft,
  FiClock,
} from "react-icons/fi";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { y: 10, opacity: 0, filter: "blur(2px)" },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
};

// HH:MM - HH:MM
const HORA_REGEX =
  /^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/;

const validarHoraRango = (texto) => {
  const value = (texto || "").trim();
  if (!value) {
    return { ok: false, mensaje: "El horario no puede estar vacío." };
  }

  const match = value.match(HORA_REGEX);
  if (!match) {
    return {
      ok: false,
      mensaje:
        "Formato de horario inválido. Usa HH:MM-HH:MM, por ejemplo 09:00-10:30.",
    };
  }

  const h1 = parseInt(match[1], 10);
  const m1 = parseInt(match[2], 10);
  const h2 = parseInt(match[3], 10);
  const m2 = parseInt(match[4], 10);

  const inicio = h1 * 60 + m1;
  const fin = h2 * 60 + m2;

  if (fin <= inicio) {
    return {
      ok: false,
      mensaje: "La hora de fin debe ser mayor a la de inicio.",
    };
  }

  return { ok: true, inicio, fin };
};

const detectarSolapamiento = (texto, rows, ignorarId = null) => {
  const value = (texto || "").trim();
  const parsedNuevo = validarHoraRango(value);
  if (!parsedNuevo.ok) return null;

  const { inicio, fin } = parsedNuevo;

  for (const r of rows) {
    if (ignorarId && r.id === ignorarId) continue;
    const existente = (r.hora || "").trim();
    const match = existente.match(HORA_REGEX);
    if (!match) continue; // horarios viejos con formato libre, no los usamos para la detección

    const h1 = parseInt(match[1], 10);
    const m1 = parseInt(match[2], 10);
    const h2 = parseInt(match[3], 10);
    const m2 = parseInt(match[4], 10);

    const ini2 = h1 * 60 + m1;
    const fin2 = h2 * 60 + m2;

    if (inicio < fin2 && ini2 < fin) {
      return existente;
    }
  }

  return null;
};

export default function PageHorarios() {
  const navigate = useNavigate();
  const { hasRole } = useContext(AuthContext);
  const canAdmin = hasRole("admin");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [newHora, setNewHora] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editHora, setEditHora] = useState("");
  const [confirmData, setConfirmData] = useState({
    open: false,
    id: null,
    mensaje: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await backendClient.get("horarios/listar");
      setRows(data);
    } catch (e) {
      errorToast(e?.message || "Error cargando horarios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createHorario = async () => {
    const check = validarHoraRango(newHora);
    if (!check.ok) {
      errorToast(check.mensaje);
      return;
    }

    const solapado = detectarSolapamiento(newHora, rows);
    if (solapado) {
      errorToast(
        `El horario ${newHora.trim()} se superpone con el horario existente ${solapado}.`
      );
      return;
    }

    setCreating(true);
    try {
      await backendClient.post("horarios/crear", { hora: newHora.trim() });
      successToast("Horario creado");
      setNewHora("");
      load();
    } catch (e) {
      errorToast(
        e?.data?.detail || e?.message || "Error al crear"
      );
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditHora(row.hora);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditHora("");
  };

  const saveEdit = async () => {
    const check = validarHoraRango(editHora);
    if (!check.ok) {
      errorToast(check.mensaje);
      return;
    }

    const solapado = detectarSolapamiento(editHora, rows, editingId);
    if (solapado) {
      errorToast(
        `El horario ${editHora.trim()} se superpone con el horario existente ${solapado}.`
      );
      return;
    }

    try {
      await backendClient.put(`horarios/modificar/${editingId}`, {
        hora: editHora.trim(),
      });
      successToast("Horario modificado");
      cancelEdit();
      load();
    } catch (e) {
      errorToast(
        e?.data?.detail || e?.message || "Error al modificar"
      );
    }
  };

  const deleteHorario = (id, hora) => {
    setConfirmData({
      open: true,
      id,
      mensaje: `¿Eliminar el horario "${hora}"?`,
    });
  };

  const ejecutarEliminacion = async () => {
    const id = confirmData.id;
    setConfirmData({ open: false, id: null, mensaje: "" });
    try {
      await backendClient.delete(`horarios/eliminar/${id}`);
      successToast("Horario eliminado");
      load();
    } catch (e) {
      errorToast(
        e?.data?.detail || e?.message || "No se pudo eliminar"
      );
    }
  };

  return (
    <motion.div
      className="max-w-5xl mx-auto space-y-8 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* HEADER */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-4 border-b border-gray-700 pb-6"
      >
        <button
          onClick={() => navigate("/panel-control/canchas")}
          className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-full transition"
        >
          <FiArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Horarios Globales</h2>
          <p className="text-gray-400 text-sm">
            Bloques de tiempo disponibles para asignar a canchas.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMNA IZQUIERDA */}
        {canAdmin && (
          <motion.div
            variants={itemVariants}
            className="lg:col-span-1 space-y-6"
          >
            <div className="bg-slate-900/60 border border-slate-700/70 p-6 rounded-xl shadow-lg sticky top-6">
              <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">
                Nuevo Horario
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">
                    Rango Horario
                  </label>
                  <div className="relative">
                    <FiClock className="absolute left-3 top-3 text-gray-500" />
                    <input
                      value={newHora}
                      onChange={(e) => setNewHora(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-3 py-2.5 text-white focus:border-yellow-400 outline-none transition-colors placeholder:text-gray-600"
                      placeholder="Ej: 19:00-20:30"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Formato: <span className="font-mono">HH:MM-HH:MM</span>{" "}
                    (ej: <span className="font-mono">09:00-10:30</span>).
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={createHorario}
                    disabled={creating}
                    variant="default"
                    icon={<FiPlus />}
                    texto={creating ? "Guardando..." : "Agregar Horario"}
                    className="w-full justify-center"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* COLUMNA DERECHA */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="bg-slate-900/60 border border-slate-700/70 rounded-xl shadow-lg overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-400">
                Cargando horarios...
              </div>
            ) : rows.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                No hay horarios globales creados.
              </div>
            ) : (
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4">Horario Definido</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="px-6 py-4 font-medium text-white">
                        {editingId === r.id ? (
                          <input
                            value={editHora}
                            onChange={(e) => setEditHora(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white focus:border-yellow-400 outline-none"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <FiClock className="text-slate-500" />
                            {r.hora}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingId === r.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={saveEdit}
                              className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition"
                            >
                              <FiSave size={18} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-2 bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white rounded-lg transition"
                            >
                              <FiX size={18} />
                            </button>
                          </div>
                        ) : (
                          canAdmin && (
                            <div className="flex justify-end gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEdit(r)}
                                className="text-slate-400 hover:text-yellow-400 transition"
                              >
                                <FiEdit2 size={18} />
                              </button>
                              <button
                                onClick={() =>
                                  deleteHorario(r.id, r.hora)
                                }
                                className="text-slate-400 hover:text-red-400 transition"
                              >
                                <FiTrash2 size={18} />
                              </button>
                            </div>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>

      {confirmData.open && (
        <MessageConfirm
          mensaje={confirmData.mensaje}
          onClose={() =>
            setConfirmData({ ...confirmData, open: false })
          }
          onConfirm={ejecutarEliminacion}
          onCancel={() =>
            setConfirmData({ ...confirmData, open: false })
          }
        />
      )}
    </motion.div>
  );
}
