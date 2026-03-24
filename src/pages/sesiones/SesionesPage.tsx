import { useEffect, useMemo, useState } from "react";
import { DoorClosed, DoorOpen, Search } from "lucide-react";
import { sesionesApi, cajasApi } from "../../services/api";
import type { Cashbox, CashboxSession } from "../../types";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/ui/StatusBadge";

type SessionView = {
  id: string;
  cajaId: string;
  fechaApertura: string;
  fechaCierre: string | null;
  saldoInicial: number;
  saldoFinalEsperado: number;
  saldoFinalReal: number;
  diferencia: number;
  estado: "ABIERTA" | "CERRADA";
};

export default function SesionesPage() {
  const [sesiones, setSesiones] = useState<CashboxSession[]>([]);
  const [cajas, setCajas] = useState<Cashbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState<SessionView | null>(null);
  const [openForm, setOpenForm] = useState({ cajaId: "", saldoInicial: "" });
  const [closeForm, setCloseForm] = useState({ saldoFinalReal: "" });

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const [sessionsResponse, cashboxesResponse] = await Promise.all([
        sesionesApi.list(),
        cajasApi.list(),
      ]);

      setSesiones(Array.isArray(sessionsResponse) ? sessionsResponse : []);
      setCajas(Array.isArray(cashboxesResponse) ? cashboxesResponse : []);
    } catch (err) {
      setError(readError(err, "No fue posible cargar las sesiones."));
      setSesiones([]);
      setCajas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const normalizedSessions = useMemo(
    () => sesiones.map((session) => normalizeSession(session)),
    [sesiones]
  );

  const openCashboxIds = useMemo(
    () =>
      new Set(
        normalizedSessions
          .filter((session) => session.estado === "ABIERTA")
          .map((session) => session.cajaId)
      ),
    [normalizedSessions]
  );

  const availableCashboxes = useMemo(
    () =>
      cajas.filter(
        (cashbox) => cashbox.estado === "ACTIVA" && !openCashboxIds.has(cashbox.id)
      ),
    [cajas, openCashboxIds]
  );

  const cajaName = (id: string) =>
    cajas.find((cashbox) => cashbox.id === id)?.nombre ?? id.slice(0, 8);

  const filtered = normalizedSessions.filter((session) =>
    cajaName(session.cajaId).toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await sesionesApi.open({
        cajaId: openForm.cajaId,
        saldoInicial: Number(openForm.saldoInicial),
      });

      setOpenModal(false);
      setOpenForm({ cajaId: "", saldoInicial: "" });
      await load();
    } catch (err) {
      setError(readError(err, "No fue posible abrir la sesión."));
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeModal) return;

    setError("");

    try {
      await sesionesApi.close(closeModal.id, {
        saldoFinalReal: Number(closeForm.saldoFinalReal),
      });

      setCloseModal(null);
      setCloseForm({ saldoFinalReal: "" });
      await load();
    } catch (err) {
      setError(readError(err, "No fue posible cerrar la sesión."));
    }
  };

  const openSessionModal = () => {
    setOpenForm({
      cajaId: availableCashboxes[0]?.id ?? "",
      saldoInicial: "",
    });
    setOpenModal(true);
  };

  const fmtMoney = (value: number) =>
    new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(value);

  const fmtDate = (value: string | null) => {
    if (!value) return "—";
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
          <h1 className="text-2xl font-bold text-slate-800">Sesiones de Caja</h1>
          <p className="text-sm text-slate-500">Apertura y cierre de sesiones</p>
        </div>

        <button
          type="button"
          onClick={openSessionModal}
          disabled={availableCashboxes.length === 0}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <DoorOpen className="h-4 w-4" />
          Abrir Sesión
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por caja..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
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
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Caja</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Apertura</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Cierre</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-600">Saldo Inicial</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-600">Esperado</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-600">Real</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-600">Diferencia</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Estado</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    Cargando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    Sin sesiones
                  </td>
                </tr>
              ) : (
                filtered.map((session) => (
                  <tr key={session.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {cajaName(session.cajaId)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {fmtDate(session.fechaApertura)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {fmtDate(session.fechaCierre)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700">
                      {fmtMoney(session.saldoInicial)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700">
                      {session.estado === "CERRADA"
                        ? fmtMoney(session.saldoFinalEsperado)
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700">
                      {session.estado === "CERRADA"
                        ? fmtMoney(session.saldoFinalReal)
                        : "—"}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-medium ${
                        session.estado === "CERRADA"
                          ? session.diferencia === 0
                            ? "text-slate-700"
                            : session.diferencia > 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          : "text-slate-400"
                      }`}
                    >
                      {session.estado === "CERRADA"
                        ? fmtMoney(session.diferencia)
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge value={session.estado} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {session.estado === "ABIERTA" && (
                        <button
                          type="button"
                          onClick={() => {
                            setCloseForm({ saldoFinalReal: "" });
                            setCloseModal(session);
                          }}
                          className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
                        >
                          <DoorClosed className="h-3.5 w-3.5" />
                          Cerrar
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

      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Abrir Sesión de Caja"
      >
        <form onSubmit={(e) => void handleOpen(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Caja</label>
            <select
              value={openForm.cajaId}
              onChange={(e) =>
                setOpenForm((current) => ({ ...current, cajaId: e.target.value }))
              }
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {availableCashboxes.length === 0 ? (
                <option value="">No hay cajas disponibles</option>
              ) : (
                availableCashboxes.map((cashbox) => (
                  <option key={cashbox.id} value={cashbox.id}>
                    {cashbox.nombre}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Saldo Inicial
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={openForm.saldoInicial}
              onChange={(e) =>
                setOpenForm((current) => ({
                  ...current,
                  saldoInicial: e.target.value,
                }))
              }
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenModal(false)}
              className="cursor-pointer rounded-lg px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={availableCashboxes.length === 0}
              className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Abrir Sesión
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={closeModal !== null}
        onClose={() => setCloseModal(null)}
        title="Cerrar Sesión de Caja"
      >
        <form onSubmit={(e) => void handleClose(e)} className="space-y-4">
          <p className="text-sm text-slate-500">
            Caja: <strong>{closeModal ? cajaName(closeModal.cajaId) : ""}</strong>
          </p>

          <p className="text-sm text-slate-500">
            Saldo inicial:{" "}
            <strong>{closeModal ? fmtMoney(closeModal.saldoInicial) : ""}</strong>
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Saldo Real al Cierre
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={closeForm.saldoFinalReal}
              onChange={(e) =>
                setCloseForm({ saldoFinalReal: e.target.value })
              }
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCloseModal(null)}
              className="cursor-pointer rounded-lg px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Cerrar Sesión
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
    fechaApertura: session.fechaApertura,
    fechaCierre: session.fechaCierre ?? null,
    saldoInicial: Number(session.saldoInicial ?? 0),
    saldoFinalEsperado: Number(
      session.saldoFinalEsperado ?? session.saldoFinal ?? 0
    ),
    saldoFinalReal: Number(
      session.saldoFinalReal ?? session.saldoRealCierre ?? 0
    ),
    diferencia: Number(session.diferencia ?? 0),
    estado: session.estado,
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