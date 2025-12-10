import { useState, useEffect, useCallback } from "react";
import { FiUsers, FiSearch, FiCheck, FiX, FiUserPlus, FiZap, FiMail } from "react-icons/fi";
import backendClient from "../../../shared/services/backendClient";
import { toast } from "react-toastify";
import MiToast from "../../../shared/components/ui/Toast/MiToast";

/**
 * Modal para configurar la cantidad de jugadores y seleccionar/invitar participantes
 * antes de confirmar la reserva.
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onConfirm: (config: { cantidad: number, invitados: string[], usarMatcheo: boolean }) => void
 * - cancha: { nombre: string, capacidad_maxima: number }
 * - fecha: string (DD-MM-YYYY)
 * - horario: string
 */
export default function ConfigurarPartidoModal({
    isOpen,
    onClose,
    onConfirm,
    cancha,
    fecha,
    horario
}) {
    // Estados
    const [step, setStep] = useState(1); // 1: cantidad, 2: invitar, 3: matcheo
    const [cantidadJugadores, setCantidadJugadores] = useState(2);
    const [capacidadMaxima, setCapacidadMaxima] = useState(6);
    const [loading, setLoading] = useState(false);

    // Búsqueda de usuarios
    const [searchQuery, setSearchQuery] = useState("");
    const [usuariosDisponibles, setUsuariosDisponibles] = useState([]);
    const [usuariosSeleccionados, setUsuariosSeleccionados] = useState([]);
    const [buscando, setBuscando] = useState(false);

    // Matcheo
    const [usuariosSugeridos, setUsuariosSugeridos] = useState([]);
    const [buscandoMatcheo, setBuscandoMatcheo] = useState(false);

    // Cargar capacidad de la cancha
    useEffect(() => {
        if (isOpen && cancha?.nombre) {
            const fetchCapacidad = async () => {
                try {
                    const res = await backendClient.get(`invitaciones/capacidad-cancha/${encodeURIComponent(cancha.nombre)}`);
                    setCapacidadMaxima(res.capacidad_maxima || 6);
                } catch {
                    // Fallback a valor por defecto o usar el de la cancha si viene
                    setCapacidadMaxima(cancha.capacidad_maxima || 6);
                }
            };
            fetchCapacidad();
        }
    }, [isOpen, cancha]);

    // Reset cuando se abre/cierra
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setCantidadJugadores(2);
            setSearchQuery("");
            setUsuariosDisponibles([]);
            setUsuariosSeleccionados([]);
            setUsuariosSugeridos([]);
        }
    }, [isOpen]);

    // Buscar usuarios disponibles
    const buscarUsuarios = useCallback(async () => {
        if (!searchQuery.trim()) {
            setUsuariosDisponibles([]);
            return;
        }

        setBuscando(true);
        try {
            const res = await backendClient.get("invitaciones/usuarios-disponibles", {
                search: searchQuery.trim(),
                limit: 10
            });
            setUsuariosDisponibles(res.usuarios || []);
        } catch (e) {
            console.error("Error buscando usuarios:", e);
        } finally {
            setBuscando(false);
        }
    }, [searchQuery]);

    // Debounce en la búsqueda
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                buscarUsuarios();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, buscarUsuarios]);

    // Seleccionar/deseleccionar usuario
    const toggleUsuario = (usuario) => {
        const yaSeleccionado = usuariosSeleccionados.some(u => u.id === usuario.id);

        if (yaSeleccionado) {
            setUsuariosSeleccionados(prev => prev.filter(u => u.id !== usuario.id));
        } else {
            // Verificar que no exceda el límite (cantidad - 1 porque el usuario actual ya cuenta)
            if (usuariosSeleccionados.length >= cantidadJugadores - 1) {
                toast(<MiToast mensaje={`Máximo ${cantidadJugadores - 1} invitados (vos ya contás como jugador)`} color="var(--color-amber-400)" />);
                return;
            }
            setUsuariosSeleccionados(prev => [...prev, usuario]);
        }
    };

    // Buscar matcheo
    const buscarMatcheo = async () => {
        const jugadoresFaltantes = cantidadJugadores - 1 - usuariosSeleccionados.length;

        if (jugadoresFaltantes <= 0) {
            toast(<MiToast mensaje="Ya tenés todos los jugadores seleccionados" color="var(--color-green-400)" />);
            return;
        }

        setBuscandoMatcheo(true);
        try {
            const res = await backendClient.post("invitaciones/buscar-matcheo", {
                cantidad_faltantes: jugadoresFaltantes,
                usuario_ids_actuales: usuariosSeleccionados.map(u => u.id),
                fecha,
                horario
            });
            setUsuariosSugeridos(res.sugeridos || []);
            setStep(3);
        } catch (e) {
            toast(<MiToast mensaje="Error buscando jugadores compatibles" color="var(--color-red-400)" />);
        } finally {
            setBuscandoMatcheo(false);
        }
    };

    // Enviar invitaciones
    const enviarInvitaciones = async () => {
        if (usuariosSeleccionados.length === 0) {
            handleConfirmFinal(false);
            return;
        }

        setLoading(true);
        try {
            const res = await backendClient.post("invitaciones/enviar", {
                usuario_ids: usuariosSeleccionados.map(u => u.id),
                fecha,
                horario,
                cancha: cancha.nombre
            });

            if (res.enviados > 0) {
                toast(<MiToast mensaje={`${res.enviados} invitación(es) enviada(s)`} color="var(--color-green-400)" />);
            }
            if (res.fallidos > 0) {
                toast(<MiToast mensaje={`${res.fallidos} invitación(es) fallaron`} color="var(--color-amber-400)" />);
            }

            handleConfirmFinal(true);
        } catch (e) {
            toast(<MiToast mensaje="Error enviando invitaciones" color="var(--color-red-400)" />);
        } finally {
            setLoading(false);
        }
    };

    // Confirmar final
    const handleConfirmFinal = (invitacionesEnviadas) => {
        const jugadoresFaltantes = cantidadJugadores - 1 - usuariosSeleccionados.length;

        onConfirm({
            cantidad: cantidadJugadores,
            invitados: usuariosSeleccionados.map(u => u.id),
            usarMatcheo: jugadoresFaltantes > 0,
            jugadoresFaltantes
        });
    };

    // Agregar usuario sugerido
    const agregarSugerido = (usuario) => {
        if (usuariosSeleccionados.some(u => u.id === usuario.id)) {
            return;
        }
        if (usuariosSeleccionados.length >= cantidadJugadores - 1) {
            toast(<MiToast mensaje={`Máximo ${cantidadJugadores - 1} invitados`} color="var(--color-amber-400)" />);
            return;
        }
        setUsuariosSeleccionados(prev => [...prev, usuario]);
        setUsuariosSugeridos(prev => prev.filter(u => u.id !== usuario.id));
    };

    if (!isOpen) return null;

    const jugadoresFaltantes = cantidadJugadores - 1 - usuariosSeleccionados.length;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-[#0F1524] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-6 py-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-400/20 rounded-lg">
                                <FiUsers className="text-amber-400 text-xl" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Configurar Partido</h3>
                                <p className="text-sm text-slate-400">{cancha?.nombre} • {horario}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <FiX size={24} />
                        </button>
                    </div>
                </div>

                {/* Steps Indicator */}
                <div className="px-6 py-3 border-b border-white/5 bg-slate-900/50">
                    <div className="flex items-center gap-2 text-xs">
                        <span className={`px-3 py-1 rounded-full ${step >= 1 ? 'bg-amber-400 text-black' : 'bg-slate-700 text-slate-400'}`}>
                            1. Cantidad
                        </span>
                        <span className="text-slate-600">→</span>
                        <span className={`px-3 py-1 rounded-full ${step >= 2 ? 'bg-amber-400 text-black' : 'bg-slate-700 text-slate-400'}`}>
                            2. Invitar
                        </span>
                        <span className="text-slate-600">→</span>
                        <span className={`px-3 py-1 rounded-full ${step >= 3 ? 'bg-amber-400 text-black' : 'bg-slate-700 text-slate-400'}`}>
                            3. Matcheo
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">

                    {/* STEP 1: Cantidad de jugadores */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <p className="text-slate-300 mb-4">
                                    ¿Cuántos jugadores van a participar en total?
                                </p>
                                <p className="text-slate-500 text-sm mb-6">
                                    Mínimo 2, máximo {capacidadMaxima} (capacidad de la cancha)
                                </p>
                            </div>

                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={() => setCantidadJugadores(Math.max(2, cantidadJugadores - 1))}
                                    disabled={cantidadJugadores <= 2}
                                    className="w-12 h-12 rounded-full bg-slate-800 text-white text-2xl font-bold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    −
                                </button>
                                <div className="w-24 h-24 flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/30">
                                    <span className="text-5xl font-bold text-amber-400">{cantidadJugadores}</span>
                                </div>
                                <button
                                    onClick={() => setCantidadJugadores(Math.min(capacidadMaxima, cantidadJugadores + 1))}
                                    disabled={cantidadJugadores >= capacidadMaxima}
                                    className="w-12 h-12 rounded-full bg-slate-800 text-white text-2xl font-bold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    +
                                </button>
                            </div>

                            <div className="text-center text-slate-400 text-sm">
                                Vos + {cantidadJugadores - 1} invitado{cantidadJugadores > 2 ? 's' : ''}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Invitar jugadores */}
                    {step === 2 && (
                        <div className="space-y-4">
                            {/* Usuarios seleccionados */}
                            {usuariosSeleccionados.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-sm text-slate-400 mb-2">
                                        Invitados ({usuariosSeleccionados.length}/{cantidadJugadores - 1}):
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {usuariosSeleccionados.map(u => (
                                            <span
                                                key={u.id}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-400/20 text-amber-400 rounded-full text-sm"
                                            >
                                                {u.nombre || u.username} {u.apellido || ''}
                                                <button
                                                    onClick={() => toggleUsuario(u)}
                                                    className="hover:text-amber-200"
                                                >
                                                    <FiX size={14} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Buscador */}
                            <div className="relative">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar jugador por nombre o email..."
                                    className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/50"
                                />
                                {buscando && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* Resultados de búsqueda */}
                            {usuariosDisponibles.length > 0 && (
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {usuariosDisponibles.map(u => {
                                        const yaSeleccionado = usuariosSeleccionados.some(s => s.id === u.id);
                                        return (
                                            <div
                                                key={u.id}
                                                onClick={() => !yaSeleccionado && toggleUsuario(u)}
                                                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${yaSeleccionado
                                                    ? 'bg-amber-400/10 border-amber-400/30'
                                                    : 'bg-slate-800/50 border-white/5 hover:border-white/20'
                                                    }`}
                                            >
                                                <div>
                                                    <p className="text-white font-medium">
                                                        {u.nombre || u.username} {u.apellido || ''}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {u.categoria} {u.email && `• ${u.email}`}
                                                    </p>
                                                </div>
                                                {yaSeleccionado ? (
                                                    <FiCheck className="text-amber-400" size={20} />
                                                ) : (
                                                    <FiUserPlus className="text-slate-400" size={20} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Mensaje si no hay resultados */}
                            {searchQuery && !buscando && usuariosDisponibles.length === 0 && (
                                <p className="text-center text-slate-500 py-4">
                                    No se encontraron jugadores
                                </p>
                            )}

                            {/* Info de jugadores faltantes */}
                            {jugadoresFaltantes > 0 && (
                                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <p className="text-blue-400 text-sm flex items-center gap-2">
                                        <FiZap />
                                        Faltan {jugadoresFaltantes} jugador{jugadoresFaltantes > 1 ? 'es' : ''}.
                                        Podés buscarlos con nuestro algoritmo de matcheo.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Matcheo */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-full text-sm mb-3">
                                    <FiZap /> Algoritmo de Matcheo
                                </div>
                                <p className="text-slate-400 text-sm">
                                    Estos jugadores tienen preferencias similares a las tuyas
                                </p>
                            </div>

                            {buscandoMatcheo ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-10 h-10 border-3 border-purple-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {usuariosSugeridos.map(u => (
                                        <div
                                            key={u.id}
                                            onClick={() => agregarSugerido(u)}
                                            className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-purple-400/30 transition-all cursor-pointer"
                                        >
                                            <div>
                                                <p className="text-white font-medium">
                                                    {u.nombre || u.username} {u.apellido || ''}
                                                </p>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-slate-500">{u.categoria}</span>
                                                    {u.match_score > 0 && (
                                                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                                                            {Math.round(u.match_score * 100)}% compatible
                                                        </span>
                                                    )}
                                                    {u.sugerido_por === 'aleatorio' && (
                                                        <span className="px-2 py-0.5 bg-slate-700 text-slate-400 rounded-full text-xs">
                                                            aleatorio
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <FiUserPlus className="text-purple-400" size={20} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Usuarios seleccionados actualizado */}
                            {usuariosSeleccionados.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <p className="text-sm text-slate-400 mb-2">
                                        Invitados seleccionados ({usuariosSeleccionados.length}/{cantidadJugadores - 1}):
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {usuariosSeleccionados.map(u => (
                                            <span
                                                key={u.id}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-400/20 text-amber-400 rounded-full text-sm"
                                            >
                                                {u.nombre || u.username}
                                                <button onClick={() => setUsuariosSeleccionados(prev => prev.filter(s => s.id !== u.id))}>
                                                    <FiX size={14} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer - Botones */}
                <div className="px-6 py-4 border-t border-white/10 bg-slate-900/50">
                    <div className="flex items-center justify-between gap-3">
                        {/* Botón Atrás */}
                        {step > 1 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="px-4 py-2.5 text-slate-400 hover:text-white transition-colors"
                            >
                                ← Atrás
                            </button>
                        )}
                        {step === 1 && <div />}

                        {/* Botones de acción */}
                        <div className="flex items-center gap-3">
                            {step === 1 && (
                                <button
                                    onClick={() => setStep(2)}
                                    className="px-6 py-2.5 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 transition-colors"
                                >
                                    Siguiente →
                                </button>
                            )}

                            {step === 2 && (
                                <>
                                    {jugadoresFaltantes > 0 && (
                                        <button
                                            onClick={buscarMatcheo}
                                            disabled={buscandoMatcheo}
                                            className="px-4 py-2.5 bg-purple-500/20 text-purple-400 font-medium rounded-xl hover:bg-purple-500/30 transition-colors flex items-center gap-2"
                                        >
                                            <FiZap /> Buscar Matcheo
                                        </button>
                                    )}
                                    <button
                                        onClick={enviarInvitaciones}
                                        disabled={loading}
                                        className="px-6 py-2.5 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 transition-colors flex items-center gap-2"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <FiMail /> {usuariosSeleccionados.length > 0 ? 'Invitar Y Terminar' : 'Continuar sin invitar'}
                                            </>
                                        )}
                                    </button>
                                </>
                            )}

                            {step === 3 && (
                                <button
                                    onClick={enviarInvitaciones}
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 transition-colors flex items-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <FiCheck /> Confirmar y Reservar
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
