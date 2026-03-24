import { useEffect, useState } from "react";
import { Plus, Search, Ban } from "lucide-react";
import { movimientosApi, cajasApi, sesionesApi } from "../../services/api";
import type { CashMovement, Cashbox, CashboxSession } from "../../types";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/ui/StatusBadge";

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<CashMovement[]>([]);
  const [cajas, setCajas] = useState<Cashbox[]>([]);
  const [sesiones, setSesiones] = useState<CashboxSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    sesionCajaId: "", tipo: "INGRESO", monto: "", moneda: "DOP", descripcion: "",
    cajaOrigenId: "", cajaDestinoId: "",
  });

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filterType) params.tipo = filterType;
    Promise.all([movimientosApi.list(params), cajasApi.list(), sesionesApi.list()])
      .then(([m, c, s]) => {
        setMovimientos(Array.isArray(m) ? m : []);
        setCajas(c);
        setSesiones(Array.isArray(s) ? s : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [filterType]);

  const cajaName = (id: string | null) => id ? (cajas.find((c) => c.id === id)?.nombre ?? id.slice(0, 8)) : "—";
  const fmt = (n: number, moneda = "DOP") => new Intl.NumberFormat("es-DO", { style: "currency", currency: moneda }).format(n);
  const fmtDate = (d: string) => new Date(d).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" });

  const filtered = movimientos.filter((m) =>
    m.descripcion?.toLowerCase().includes(search.toLowerCase()) || m.tipo.toLowerCase().includes(search.toLowerCase())
  );

  const openSessions = sesiones.filter((s) => s.estado === "ABIERTA");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {
      sesionCajaId: form.sesionCajaId, tipo: form.tipo, monto: Number(form.monto),
      moneda: form.moneda, descripcion: form.descripcion,
    };
    if (form.tipo === "TRANSFERENCIA" || form.tipo === "REABASTECIMIENTO") {
      if (form.cajaOrigenId) body.cajaOrigenId = form.cajaOrigenId;
      if (form.cajaDestinoId) body.cajaDestinoId = form.cajaDestinoId;
    }
    await movimientosApi.create(body);
    setModal(false);
    load();
  };

  const handleVoid = async (id: string) => {
    if (!confirm("¿Anular este movimiento?")) return;
    await movimientosApi.void(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Movimientos de Efectivo</h1>
          <p className="text-slate-500 text-sm">Registro de depósitos, retiros, transferencias y reabastecimientos</p>
        </div>
        <button onClick={() => { setForm({ sesionCajaId: openSessions[0]?.id ?? "", tipo: "INGRESO", monto: "", moneda: "DOP", descripcion: "", cajaOrigenId: "", cajaDestinoId: "" }); setModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
          <Plus className="w-4 h-4" /> Nuevo Movimiento
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
          <option value="">Todos los tipos</option>
          <option value="INGRESO">Ingreso</option>
          <option value="EGRESO">Egreso</option>
          <option value="TRANSFERENCIA">Transferencia</option>
          <option value="REABASTECIMIENTO">Reabastecimiento</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Fecha</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Tipo</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Monto</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Moneda</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Descripción</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Origen</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Destino</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Sin movimientos</td></tr>
              ) : filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500">{fmtDate(m.fecha)}</td>
                  <td className="px-6 py-4"><StatusBadge value={m.tipo} /></td>
                  <td className="px-6 py-4 text-right font-medium text-slate-800">{fmt(m.monto, m.moneda)}</td>
                  <td className="px-6 py-4 text-slate-500">{m.moneda}</td>
                  <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate">{m.descripcion}</td>
                  <td className="px-6 py-4 text-slate-500">{cajaName(m.cajaOrigenId)}</td>
                  <td className="px-6 py-4 text-slate-500">{cajaName(m.cajaDestinoId)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleVoid(m.id)} className="p-2 hover:bg-red-50 rounded-lg cursor-pointer" title="Anular">
                      <Ban className="w-4 h-4 text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo Movimiento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sesión de Caja</label>
            <select value={form.sesionCajaId} onChange={(e) => setForm({ ...form, sesionCajaId: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
              {openSessions.map((s) => <option key={s.id} value={s.id}>{cajaName(s.cajaId)} (Sesión abierta)</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value="INGRESO">Ingreso</option><option value="EGRESO">Egreso</option>
                <option value="TRANSFERENCIA">Transferencia</option><option value="REABASTECIMIENTO">Reabastecimiento</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
              <select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value="DOP">DOP</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
            <input type="number" min="0.01" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          {(form.tipo === "TRANSFERENCIA" || form.tipo === "REABASTECIMIENTO") && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Caja Origen</label>
                <select value={form.cajaOrigenId} onChange={(e) => setForm({ ...form, cajaOrigenId: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                  <option value="">— Ninguna —</option>
                  {cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Caja Destino</label>
                <select value={form.cajaDestinoId} onChange={(e) => setForm({ ...form, cajaDestinoId: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                  <option value="">— Ninguna —</option>
                  {cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
            <button type="submit" className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg cursor-pointer">Registrar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
