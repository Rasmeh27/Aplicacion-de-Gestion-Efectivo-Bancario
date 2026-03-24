import { useEffect, useMemo, useState } from "react";
import { Ban, Plus, Search } from "lucide-react";
import { movimientosApi, cajasApi, sesionesApi } from "../../services/api";
import type {
  CashMovement,
  Cashbox,
  CashboxSession,
  MovementType,
} from "../../types";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/ui/StatusBadge";

type SessionView = {
  id: string;
  cajaId: string;
  estado: "ABIERTA" | "CERRADA";
};

type MovementView = {
  id: string;
  fecha: string;
  tipo: MovementType;
  medio: string;
  monto: number;
  moneda: string;
  referencia: string | null;
  observacion: string | null;
  estado: "ACTIVO" | "ANULADO";
  cajaId: string;
  sesionCajaId: string;
  usuarioId: string;
  cajaOrigenId: string | null;
  cajaDestinoId: string | null;
};

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<CashMovement[]>([]);
  const [cajas, setCajas] = useState<Cashbox[]>([]);
  const [sesiones, setSesiones] = useState<CashboxSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);

  const [form, setForm] = useState({
    sesionCajaId: "",
    tipo: "INGRESO" as MovementType,
    medio: "EFECTIVO",
    monto: "",
    moneda: "DOP",
    referencia: "",
    observacion: "",
    cajaDestinoId: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const params: Record<string, string> = {};
      if (filterType) params.tipo = filterType;

      const [movementsResponse, cashboxesResponse, sessionsResponse] =
        await Promise.all([
          movimientosApi.list(params),
          cajasApi.list(),
          sesionesApi.list({ estado: "ABIERTA" }),
        ]);

      setMovimientos(Array.isArray(movementsResponse) ? movementsResponse : []);
      setCajas(Array.isArray(cashboxesResponse) ? cashboxesResponse : []);
      setSesiones(Array.isArray(sessionsResponse) ? sessionsResponse : []);
    } catch (err) {
      setError(readError(err, "No fue posible cargar los movimientos."));
      setMovimientos([]);
      setCajas([]);
      setSesiones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filterType]);

  const normalizedSessions = useMemo(
    () => sesiones.map((session) => normalizeSession(session)),
    [sesiones]
  );

  const normalizedMovements = useMemo(
    () => movimientos.map((movement) => normalizeMovement(movement)),
    [movimientos]
  );

  const openSessions = useMemo(
    () => normalizedSessions.filter((session) => session.estado === "ABIERTA"),
    [normalizedSessions]
  );

  const selectedSession = useMemo(
    () => openSessions.find((session) => session.id === form.sesionCajaId) ?? null,
    [openSessions, form.sesionCajaId]
  );

  const transferTargetCashboxes = useMemo(() => {
    const currentCashboxId = selectedSession?.cajaId ?? "";

    return openSessions
      .filter((session) => session.cajaId !== currentCashboxId)
      .map((session) => ({
        id: session.cajaId,
        nombre:
          cajas.find((cashbox) => cashbox.id === session.cajaId)?.nombre ??
          session.cajaId.slice(0, 8),
      }));
  }, [openSessions, selectedSession, cajas]);

  const cajaName = (id: string | null) =>
    id ? cajas.find((cashbox) => cashbox.id === id)?.nombre ?? id.slice(0, 8) : "—";

  const filtered = normalizedMovements.filter((movement) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return (
      movement.tipo.toLowerCase().includes(query) ||
      movement.medio.toLowerCase().includes(query) ||
      (movement.observacion ?? "").toLowerCase().includes(query) ||
      (movement.referencia ?? "").toLowerCase().includes(query) ||
      cajaName(movement.cajaId).toLowerCase().includes(query)
    );
  });

  const openCreateModal = () => {
    const defaultSession = openSessions[0];
    const defaultCashboxId = defaultSession?.cajaId ?? "";

    const firstTransferTarget = openSessions.find(
      (session) => session.cajaId !== defaultCashboxId
    );

    setForm({
      sesionCajaId: defaultSession?.id ?? "",
      tipo: "INGRESO",
      medio: "EFECTIVO",
      monto: "",
      moneda: "DOP",
      referencia: "",
      observacion: "",
      cajaDestinoId: firstTransferTarget?.cajaId ?? "",
    });

    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedSession) {
      setError("Debes seleccionar una sesión abierta.");
      return;
    }

    const payload: Record<string, unknown> = {
      tipo: form.tipo,
      medio: form.medio,
      monto: Number(form.monto),
      moneda: form.moneda,
      referencia: form.referencia || undefined,
      observacion: form.observacion || undefined,
      cajaId: selectedSession.cajaId,
      sesionCajaId: selectedSession.id,
    };

    if (form.tipo === "TRANSFERENCIA") {
      if (!form.cajaDestinoId) {
        setError("Debes seleccionar la caja destino para la transferencia.");
        return;
      }

      payload.cajaOrigenId = selectedSession.cajaId;
      payload.cajaDestinoId = form.cajaDestinoId;
    }

    if (form.tipo === "REABASTECIMIENTO") {
      payload.cajaDestinoId = selectedSession.cajaId;
    }

    try {
      await movimientosApi.create(payload);
      setModal(false);
      await load();
    } catch (err) {
      setError(readError(err, "No fue posible registrar el movimiento."));
    }
  };

  const handleVoid = async (id: string) => {
    const confirmed = window.confirm("¿Anular este movimiento?");
    if (!confirmed) return;

    setError("");

    try {
      await movimientosApi.void(id);
      await load();
    } catch (err) {
      setError(readError(err, "No fue posible anular el movimiento."));
    }
  };

  const fmtMoney = (value: number, currency = "DOP") =>
    new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency,
    }).format(value);

  const fmtDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("es-DO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Movimientos de Efectivo</h1>
          <p className="text-sm text-slate-500">
            Registro de depósitos, retiros, transferencias y reabastecimientos
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={openSessions.length === 0}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Nuevo Movimiento
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Todos los tipos</option>
          <option value="INGRESO">Ingreso</option>
          <option value="EGRESO">Egreso</option>
          <option value="TRANSFERENCIA">Transferencia</option>
          <option value="REABASTECIMIENTO">Reabastecimiento</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Fecha</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Tipo</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Medio</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-600">Monto</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Caja</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Origen</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Destino</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Observación</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Estado</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-slate-400">
                    Cargando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-slate-400">
                    Sin movimientos
                  </td>
                </tr>
              ) : (
                filtered.map((movement) => (
                  <tr key={movement.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-500">{fmtDate(movement.fecha)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge value={movement.tipo} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">{movement.medio}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800">
                      {fmtMoney(movement.monto, movement.moneda)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{cajaName(movement.cajaId)}</td>
                    <td className="px-6 py-4 text-slate-500">{cajaName(movement.cajaOrigenId)}</td>
                    <td className="px-6 py-4 text-slate-500">{cajaName(movement.cajaDestinoId)}</td>
                    <td className="max-w-[260px] truncate px-6 py-4 text-slate-600">
                      {movement.observacion ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge value={movement.estado} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {movement.estado === "ACTIVO" && (
                        <button
                          type="button"
                          onClick={() => void handleVoid(movement.id)}
                          className="rounded-lg p-2 transition hover:bg-red-50"
                          title="Anular"
                        >
                          <Ban className="h-4 w-4 text-red-500" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo Movimiento">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Sesión de Caja
            </label>
            <select
              value={form.sesionCajaId}
              onChange={(e) =>
                setForm((current) => ({ ...current, sesionCajaId: e.target.value }))
              }
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {openSessions.length === 0 ? (
                <option value="">No hay sesiones abiertas</option>
              ) : (
                openSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {cajaName(session.cajaId)} (Sesión abierta)
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    tipo: e.target.value as MovementType,
                    cajaDestinoId:
                      e.target.value === "TRANSFERENCIA"
                        ? current.cajaDestinoId
                        : "",
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="INGRESO">Ingreso</option>
                <option value="EGRESO">Egreso</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="REABASTECIMIENTO">Reabastecimiento</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Medio</label>
              <select
                value={form.medio}
                onChange={(e) =>
                  setForm((current) => ({ ...current, medio: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                <option value="CHEQUE">CHEQUE</option>
                <option value="ATM">ATM</option>
                <option value="OTRO">OTRO</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Moneda</label>
              <select
                value={form.moneda}
                onChange={(e) =>
                  setForm((current) => ({ ...current, moneda: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="DOP">DOP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Monto</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.monto}
              onChange={(e) =>
                setForm((current) => ({ ...current, monto: e.target.value }))
              }
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Referencia
              </label>
              <input
                value={form.referencia}
                onChange={(e) =>
                  setForm((current) => ({ ...current, referencia: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Caja de la sesión
              </label>
              <input
                value={selectedSession ? cajaName(selectedSession.cajaId) : ""}
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Observación
            </label>
            <input
              value={form.observacion}
              onChange={(e) =>
                setForm((current) => ({ ...current, observacion: e.target.value }))
              }
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {form.tipo === "TRANSFERENCIA" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Caja Destino
              </label>
              <select
                value={form.cajaDestinoId}
                onChange={(e) =>
                  setForm((current) => ({ ...current, cajaDestinoId: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">— Seleccionar destino —</option>
                {transferTargetCashboxes.map((cashbox) => (
                  <option key={cashbox.id} value={cashbox.id}>
                    {cashbox.nombre}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                La caja origen será la caja asociada a la sesión seleccionada.
              </p>
            </div>
          )}

          {form.tipo === "REABASTECIMIENTO" && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              El reabastecimiento se registrará en la caja de la sesión seleccionada.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModal(false)}
              className="cursor-pointer rounded-lg px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Registrar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function normalizeSession(session: CashboxSession): SessionView {
  return {
    id: session.id,
    cajaId: session.cajaId,
    estado: session.estado,
  };
}

function normalizeMovement(movement: CashMovement): MovementView {
  return {
    id: movement.id,
    fecha: movement.fecha,
    tipo: movement.tipo,
    medio: movement.medio ?? "—",
    monto: Number(movement.monto ?? 0),
    moneda: movement.moneda ?? "DOP",
    referencia: movement.referencia ?? null,
    observacion: movement.observacion ?? movement.descripcion ?? null,
    estado: movement.estado ?? "ACTIVO",
    cajaId: movement.cajaId,
    sesionCajaId: movement.sesionCajaId,
    usuarioId: movement.usuarioId,
    cajaOrigenId: movement.cajaOrigenId ?? null,
    cajaDestinoId: movement.cajaDestinoId ?? null,
  };
}

function readError(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const data = (error.response as { data?: { error?: { message?: string } } }).data;
    return data?.error?.message ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}