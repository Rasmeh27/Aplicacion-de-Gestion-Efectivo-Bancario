import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Play, Plus, Search, XCircle } from "lucide-react";
import { solicitudesApi, sucursalesApi } from "../../services/api";
import type { FundRequest, RequestStatus, Sucursal } from "../../types";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/ui/StatusBadge";

type RequestView = {
  id: string;
  status: RequestStatus;
  monto: number;
  moneda: string;
  motivo: string;
  prioridad: string;
  origenId: string | null;
  destinoId: string | null;
  fecha: string;
  motivoRechazo?: string | null;
};

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<RequestView[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal] = useState(false);
  const [resolveModal, setResolveModal] = useState<RequestView | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    monto: "",
    moneda: "DOP",
    motivo: "",
    prioridad: "MEDIA",
    origenSucursalId: "",
    destinoSucursalId: "",
  });
  const [resolveForm, setResolveForm] = useState({ decision: "APROBADA", motivo: "" });

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.estado = filterStatus;

      const [requestsResponse, branchesResponse] = await Promise.all([
        solicitudesApi.list(params),
        sucursalesApi.list(),
      ]);

      setSolicitudes(
        (Array.isArray(requestsResponse) ? (requestsResponse as FundRequest[]) : []).map((item) =>
          normalizeRequest(item)
        )
      );
      setSucursales(Array.isArray(branchesResponse) ? (branchesResponse as Sucursal[]) : []);
    } catch (err) {
      setError(readError(err, "No fue posible cargar las solicitudes."));
      setSolicitudes([]);
      setSucursales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filterStatus]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return solicitudes;
    return solicitudes.filter((item) => item.motivo.toLowerCase().includes(query));
  }, [search, solicitudes]);

  const sucName = (id: string | null) =>
    id ? sucursales.find((sucursal) => sucursal.id === id)?.nombre ?? id.slice(0, 8) : "—";

  const fmt = (n: number, moneda = "DOP") =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: moneda }).format(n);

  const fmtDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" });
  };

  const openResolveModal = (request: RequestView, decision: "APROBADA" | "RECHAZADA") => {
    setResolveForm({
      decision,
      motivo: decision === "RECHAZADA" ? request.motivoRechazo ?? "" : "",
    });
    setResolveModal(request);
  };

  const resetCreateForm = () => {
    setForm({
      monto: "",
      moneda: "DOP",
      motivo: "",
      prioridad: "MEDIA",
      origenSucursalId: "",
      destinoSucursalId: "",
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    await solicitudesApi.create({
      monto: Number(form.monto),
      moneda: form.moneda,
      motivo: form.motivo,
      prioridad: form.prioridad,
      origenScope: "SUCURSAL",
      origenId: form.origenSucursalId,
      destinoScope: "SUCURSAL",
      destinoId: form.destinoSucursalId,
    });

    setModal(false);
    resetCreateForm();
    await load();
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModal) return;

    setError("");

    const isRejected = resolveForm.decision === "RECHAZADA";

    await solicitudesApi.resolve(resolveModal.id, {
      decision: resolveForm.decision,
      comentario: resolveForm.motivo || undefined,
      motivoRechazo: isRejected ? resolveForm.motivo || undefined : undefined,
    });

    setResolveModal(null);
    setResolveForm({ decision: "APROBADA", motivo: "" });
    await load();
  };

  const handleExecute = async (id: string) => {
    if (!window.confirm("¿Ejecutar esta solicitud?")) return;
    setError("");
    await solicitudesApi.execute(id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Solicitudes de Fondos</h1>
          <p className="text-sm text-slate-500">
            Gestión y aprobación de solicitudes de fondos entre áreas
          </p>
        </div>
        <button
          onClick={() => {
            resetCreateForm();
            setModal(true);
          }}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> Nueva Solicitud
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por motivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="APROBADA">Aprobada</option>
          <option value="RECHAZADA">Rechazada</option>
          <option value="EJECUTADA">Ejecutada</option>
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
                <th className="px-6 py-3 text-right font-semibold text-slate-600">Monto</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Motivo</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Prioridad</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Origen</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Destino</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Estado</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    Cargando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    Sin solicitudes
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-500">{fmtDate(item.fecha)}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800">
                      {fmt(item.monto, item.moneda)}
                    </td>
                    <td className="max-w-[240px] truncate px-6 py-4 text-slate-600">
                      {item.motivo}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge value={item.prioridad} />
                    </td>
                    <td className="px-6 py-4 text-slate-500">{sucName(item.origenId)}</td>
                    <td className="px-6 py-4 text-slate-500">{sucName(item.destinoId)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge value={item.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {item.status === "PENDIENTE" && (
                          <>
                            <button
                              onClick={() => openResolveModal(item, "APROBADA")}
                              className="rounded-lg p-2 transition hover:bg-emerald-50"
                              title="Aprobar"
                            >
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                            </button>
                            <button
                              onClick={() => openResolveModal(item, "RECHAZADA")}
                              className="rounded-lg p-2 transition hover:bg-red-50"
                              title="Rechazar"
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </button>
                          </>
                        )}

                        {item.status === "APROBADA" && (
                          <button
                            onClick={() => void handleExecute(item.id)}
                            className="rounded-lg p-2 transition hover:bg-blue-50"
                            title="Ejecutar"
                          >
                            <Play className="h-4 w-4 text-blue-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nueva Solicitud de Fondos">
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Monto</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Moneda</label>
              <select
                value={form.moneda}
                onChange={(e) => setForm({ ...form, moneda: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="DOP">DOP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Motivo</label>
            <textarea
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              required
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Prioridad</label>
            <select
              value={form.prioridad}
              onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Sucursal Origen</label>
              <select
                value={form.origenSucursalId}
                onChange={(e) => setForm({ ...form, origenSucursalId: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">— Seleccionar —</option>
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id} value={sucursal.id}>
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Sucursal Destino</label>
              <select
                value={form.destinoSucursalId}
                onChange={(e) => setForm({ ...form, destinoSucursalId: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">— Seleccionar —</option>
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id} value={sucursal.id}>
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
              Crear Solicitud
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={resolveModal !== null} onClose={() => setResolveModal(null)} title="Resolver Solicitud">
        <form onSubmit={(e) => void handleResolve(e)} className="space-y-4">
          <p className="text-sm text-slate-500">
            Monto: <strong>{resolveModal ? fmt(resolveModal.monto, resolveModal.moneda) : ""}</strong>
          </p>
          <p className="text-sm text-slate-500">
            Motivo: <strong>{resolveModal?.motivo}</strong>
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Decisión</label>
            <div className="flex gap-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="decision"
                  value="APROBADA"
                  checked={resolveForm.decision === "APROBADA"}
                  onChange={(e) => setResolveForm({ ...resolveForm, decision: e.target.value, motivo: "" })}
                />
                <span className="text-sm font-medium text-emerald-600">Aprobar</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="decision"
                  value="RECHAZADA"
                  checked={resolveForm.decision === "RECHAZADA"}
                  onChange={(e) => setResolveForm({ ...resolveForm, decision: e.target.value })}
                />
                <span className="text-sm font-medium text-red-600">Rechazar</span>
              </label>
            </div>
          </div>

          {resolveForm.decision === "RECHAZADA" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Motivo de rechazo</label>
              <textarea
                value={resolveForm.motivo}
                onChange={(e) => setResolveForm({ ...resolveForm, motivo: e.target.value })}
                rows={2}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setResolveModal(null)}
              className="cursor-pointer rounded-lg px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium text-white ${
                resolveForm.decision === "APROBADA"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {resolveForm.decision === "APROBADA" ? "Aprobar" : "Rechazar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function normalizeRequest(request: FundRequest): RequestView {
  return {
    id: request.id,
    status: request.estado ?? request.status ?? "PENDIENTE",
    monto: request.monto,
    moneda: request.moneda ?? "DOP",
    motivo: request.motivo ?? "",
    prioridad: request.prioridad ?? "MEDIA",
    origenId: request.origenId ?? request.origenSucursalId ?? null,
    destinoId: request.destinoId ?? request.destinoSucursalId ?? null,
    fecha: request.fechaSolicitud ?? request.fecha ?? "",
    motivoRechazo: request.motivoRechazo ?? null,
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