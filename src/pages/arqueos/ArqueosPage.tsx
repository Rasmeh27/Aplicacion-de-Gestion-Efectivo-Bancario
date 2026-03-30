import { useEffect, useState } from "react";
import { Plus, Search, ClipboardCheck, AlertTriangle } from "lucide-react";
import { arqueosApi, sesionesApi, cajasApi } from "../../services/api";
import type { CashboxAudit, CashboxSession, Cashbox } from "../../types";
import Modal from "../../components/ui/Modal";

export default function ArqueosPage() {
  const [arqueos, setArqueos] = useState<CashboxAudit[]>([]);
  const [sesiones, setSesiones] = useState<CashboxSession[]>([]);
  const [cajas, setCajas] = useState<Cashbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMoneda, setFilterMoneda] = useState("TODAS");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ sesionCajaId: "", moneda: "DOP", observaciones: "" } as Record<string, string>);

  const DENOMINATIONS_DOP = ["billete2000", "billete1000", "billete500", "billete200", "billete100", "billete50", "moneda25", "moneda10", "moneda5", "moneda1"];

  const load = () => {
    setLoading(true);
    Promise.all([arqueosApi.list(), sesionesApi.list(), cajasApi.list()])
      .then(([a, s, c]) => {
        setArqueos(Array.isArray(a) ? a : []);
        setSesiones(Array.isArray(s) ? s : []);
        setCajas(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const cajaNameFromSession = (sesionId: string) => {
    const ses = sesiones.find((s) => s.id === sesionId);
    if (!ses) return sesionId.slice(0, 8);
    return cajas.find((c) => c.id === ses.cajaId)?.nombre ?? ses.cajaId.slice(0, 8);
  };

  const fmt = (n: number, moneda: string = "DOP") => new Intl.NumberFormat("es-DO", { style: "currency", currency: moneda === "USD" ? "USD" : "DOP" }).format(n);
  const fmtDate = (d: string) => new Date(d).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" });

  const openSessions = sesiones.filter((s) => s.estado === "ABIERTA");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {
      sesionCajaId: form.sesionCajaId,
      moneda: form.moneda,
      observaciones: form.observaciones || undefined,
    };
    for (const d of DENOMINATIONS_DOP) {
      if (form[d]) body[d] = Number(form[d]);
    }
    await arqueosApi.create(body);
    setModal(false);
    load();
  };

  const filtered = arqueos.filter((a) =>
    cajaNameFromSession(a.sesionCajaId).toLowerCase().includes(search.toLowerCase()) &&
    (filterMoneda === "TODAS" || a.moneda === filterMoneda)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Arqueos de Caja</h1>
          <p className="text-slate-500 text-sm">Control y verificación de saldos en caja</p>
        </div>
        <button onClick={() => { const base: Record<string, string> = { sesionCajaId: openSessions[0]?.id ?? "", moneda: "DOP", observaciones: "" }; DENOMINATIONS_DOP.forEach((d) => base[d] = "0"); setForm(base); setModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
          <Plus className="w-4 h-4" /> Nuevo Arqueo
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar por caja..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1">
          {["TODAS", "DOP", "USD", "EUR"].map((m) => (
            <button key={m} onClick={() => setFilterMoneda(m)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${filterMoneda === m ? "bg-slate-700 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
              {m === "TODAS" ? "Todas" : m}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Fecha</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Caja</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Moneda</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Contado</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Esperado</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Diferencia</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Sin arqueos</td></tr>
              ) : filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500">{fmtDate(a.fecha)}</td>
                  <td className="px-6 py-4 text-slate-700 font-medium">{cajaNameFromSession(a.sesionCajaId)}</td>
                  <td className="px-6 py-4 text-slate-500">{a.moneda}</td>
                  <td className="px-6 py-4 text-right text-slate-700">{fmt(a.saldoContado, a.moneda)}</td>
                  <td className="px-6 py-4 text-right text-slate-700">{fmt(a.saldoEsperado, a.moneda)}</td>
                  <td className={`px-6 py-4 text-right font-bold ${a.diferencia === 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {a.diferencia > 0 ? "+" : ""}{fmt(a.diferencia, a.moneda)}
                  </td>
                  <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate">{a.observaciones ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo Arqueo de Caja">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sesión de Caja</label>
            {openSessions.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">No hay sesiones disponibles</p>
                  <p className="text-xs text-red-500 mt-0.5">Debe abrir una sesión de caja antes de realizar un arqueo.</p>
                </div>
              </div>
            ) : (
              <select value={form.sesionCajaId} onChange={(e) => setForm({ ...form, sesionCajaId: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                {openSessions.map((s) => {
                  const caja = cajas.find((c) => c.id === s.cajaId);
                  return <option key={s.id} value={s.id}>{caja?.nombre ?? "Caja"} (Sesión abierta)</option>;
                })}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Conteo de Denominaciones (DOP)</label>
            <div className="grid grid-cols-2 gap-2">
              {DENOMINATIONS_DOP.map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 w-24">{d.replace("billete", "B$").replace("moneda", "M$")}</label>
                  <input type="number" min="0" value={form[d] ?? "0"} onChange={(e) => setForm({ ...form, [d]: e.target.value })} className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
            <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
            <button type="submit" disabled={openSessions.length === 0} className={`px-4 py-2.5 text-white text-sm font-medium rounded-lg flex items-center gap-2 ${openSessions.length === 0 ? "bg-slate-300 cursor-not-allowed" : "bg-slate-700 hover:bg-slate-800 cursor-pointer"}`}><ClipboardCheck className="w-4 h-4" /> Realizar Arqueo</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
