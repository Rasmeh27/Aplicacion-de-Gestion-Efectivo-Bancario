import { useEffect, useState } from "react";
import { Plus, Search, CheckCircle, XCircle, Play } from "lucide-react";
import { solicitudesApi, sucursalesApi } from "../../services/api";
import type { FundRequest, Sucursal } from "../../types";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/ui/StatusBadge";

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<FundRequest[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal] = useState(false);
  const [resolveModal, setResolveModal] = useState<FundRequest | null>(null);
  const [form, setForm] = useState({ monto: "", moneda: "DOP", motivo: "", prioridad: "MEDIA", origenSucursalId: "", destinoSucursalId: "" });
  const [resolveForm, setResolveForm] = useState({ decision: "APROBADA", motivo: "" });

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    Promise.all([solicitudesApi.list(params), sucursalesApi.list()])
      .then(([s, suc]) => { setSolicitudes(Array.isArray(s) ? s : []); setSucursales(suc); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [filterStatus]);

  const sucName = (id: string | null) => id ? (sucursales.find((s) => s.id === id)?.nombre ?? id.slice(0, 8)) : "—";
  const fmt = (n: number, moneda = "DOP") => new Intl.NumberFormat("es-DO", { style: "currency", currency: moneda }).format(n);
  const fmtDate = (d: string) => new Date(d).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" });

  const filtered = solicitudes.filter((s) => s.motivo?.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await solicitudesApi.create({
      monto: Number(form.monto), moneda: form.moneda, motivo: form.motivo,
      prioridad: form.prioridad,
      origenSucursalId: form.origenSucursalId || undefined,
      destinoSucursalId: form.destinoSucursalId || undefined,
    });
    setModal(false);
    load();
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModal) return;
    await solicitudesApi.resolve(resolveModal.id, {
      decision: resolveForm.decision,
      motivo: resolveForm.motivo || undefined,
    });
    setResolveModal(null);
    load();
  };

  const handleExecute = async (id: string) => {
    if (!confirm("¿Ejecutar esta solicitud?")) return;
    await solicitudesApi.execute(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Solicitudes de Fondos</h1>
          <p className="text-slate-500 text-sm">Gestión y aprobación de solicitudes de fondos entre áreas</p>
        </div>
        <button onClick={() => { setForm({ monto: "", moneda: "DOP", motivo: "", prioridad: "MEDIA", origenSucursalId: "", destinoSucursalId: "" }); setModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
          <Plus className="w-4 h-4" /> Nueva Solicitud
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar por motivo..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="APROBADA">Aprobada</option>
          <option value="RECHAZADA">Rechazada</option>
          <option value="EJECUTADA">Ejecutada</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Fecha</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Monto</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Motivo</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Prioridad</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Origen</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Destino</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Sin solicitudes</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500">{fmtDate(s.fecha)}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-800">{fmt(s.monto, s.moneda)}</td>
                  <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate">{s.motivo}</td>
                  <td className="px-6 py-4"><StatusBadge value={s.prioridad} /></td>
                  <td className="px-6 py-4 text-slate-500">{sucName(s.origenSucursalId)}</td>
                  <td className="px-6 py-4 text-slate-500">{sucName(s.destinoSucursalId)}</td>
                  <td className="px-6 py-4"><StatusBadge value={s.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {s.status === "PENDIENTE" && (
                        <button onClick={() => { setResolveForm({ decision: "APROBADA", motivo: "" }); setResolveModal(s); }} className="p-2 hover:bg-emerald-50 rounded-lg cursor-pointer" title="Resolver">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </button>
                      )}
                      {s.status === "APROBADA" && (
                        <button onClick={() => handleExecute(s.id)} className="p-2 hover:bg-blue-50 rounded-lg cursor-pointer" title="Ejecutar">
                          <Play className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nueva Solicitud de Fondos">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
              <input type="number" min="0.01" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
              <select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value="DOP">DOP</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
            <textarea value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} required rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
            <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
              <option value="BAJA">Baja</option><option value="MEDIA">Media</option><option value="ALTA">Alta</option><option value="URGENTE">Urgente</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sucursal Origen</label>
              <select value={form.origenSucursalId} onChange={(e) => setForm({ ...form, origenSucursalId: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value="">— Seleccionar —</option>
                {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sucursal Destino</label>
              <select value={form.destinoSucursalId} onChange={(e) => setForm({ ...form, destinoSucursalId: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value="">— Seleccionar —</option>
                {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
            <button type="submit" className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg cursor-pointer">Crear Solicitud</button>
          </div>
        </form>
      </Modal>

      {/* Resolve modal */}
      <Modal open={resolveModal !== null} onClose={() => setResolveModal(null)} title="Resolver Solicitud">
        <form onSubmit={handleResolve} className="space-y-4">
          <p className="text-sm text-slate-500">Monto: <strong>{resolveModal ? fmt(resolveModal.monto, resolveModal.moneda) : ""}</strong></p>
          <p className="text-sm text-slate-500">Motivo: <strong>{resolveModal?.motivo}</strong></p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Decisión</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="decision" value="APROBADA" checked={resolveForm.decision === "APROBADA"} onChange={(e) => setResolveForm({ ...resolveForm, decision: e.target.value })} />
                <span className="text-sm text-emerald-600 font-medium">Aprobar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="decision" value="RECHAZADA" checked={resolveForm.decision === "RECHAZADA"} onChange={(e) => setResolveForm({ ...resolveForm, decision: e.target.value })} />
                <span className="text-sm text-red-600 font-medium">Rechazar</span>
              </label>
            </div>
          </div>
          {resolveForm.decision === "RECHAZADA" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Motivo de rechazo</label>
              <textarea value={resolveForm.motivo} onChange={(e) => setResolveForm({ ...resolveForm, motivo: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setResolveModal(null)} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
            <button type="submit" className={`px-4 py-2.5 text-white text-sm font-medium rounded-lg cursor-pointer ${resolveForm.decision === "APROBADA" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
              {resolveForm.decision === "APROBADA" ? "Aprobar" : "Rechazar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
