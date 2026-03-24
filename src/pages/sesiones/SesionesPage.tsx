import { useEffect, useState } from "react";
import { DoorOpen, DoorClosed, Search } from "lucide-react";
import { sesionesApi, cajasApi } from "../../services/api";
import type { CashboxSession, Cashbox } from "../../types";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/ui/StatusBadge";

export default function SesionesPage() {
  const [sesiones, setSesiones] = useState<CashboxSession[]>([]);
  const [cajas, setCajas] = useState<Cashbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState<CashboxSession | null>(null);
  const [openForm, setOpenForm] = useState({ cajaId: "", saldoInicial: "" });
  const [closeForm, setCloseForm] = useState({ saldoRealCierre: "" });

  const load = () => {
    setLoading(true);
    Promise.all([sesionesApi.list(), cajasApi.list()])
      .then(([s, c]) => { setSesiones(Array.isArray(s) ? s : []); setCajas(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const cajaName = (id: string) => cajas.find((c) => c.id === id)?.nombre ?? id.slice(0, 8);

  const fmt = (n: number) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(n);
  const fmtDate = (d: string) => new Date(d).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" });

  const filtered = sesiones.filter((s) => cajaName(s.cajaId).toLowerCase().includes(search.toLowerCase()));

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    await sesionesApi.open({ cajaId: openForm.cajaId, saldoInicial: Number(openForm.saldoInicial) });
    setOpenModal(false);
    load();
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeModal) return;
    await sesionesApi.close(closeModal.id, { saldoRealCierre: Number(closeForm.saldoRealCierre) });
    setCloseModal(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sesiones de Caja</h1>
          <p className="text-slate-500 text-sm">Apertura y cierre de sesiones</p>
        </div>
        <button onClick={() => { setOpenForm({ cajaId: cajas[0]?.id ?? "", saldoInicial: "" }); setOpenModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
          <DoorOpen className="w-4 h-4" /> Abrir Sesión
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Buscar por caja..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Caja</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Apertura</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Cierre</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Saldo Inicial</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Saldo Cierre</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Sin sesiones</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-700 font-medium">{cajaName(s.cajaId)}</td>
                  <td className="px-6 py-4 text-slate-500">{fmtDate(s.fechaApertura)}</td>
                  <td className="px-6 py-4 text-slate-500">{s.fechaCierre ? fmtDate(s.fechaCierre) : "—"}</td>
                  <td className="px-6 py-4 text-right text-slate-700">{fmt(s.saldoInicial)}</td>
                  <td className="px-6 py-4 text-right text-slate-700">{s.saldoRealCierre != null ? fmt(s.saldoRealCierre) : "—"}</td>
                  <td className="px-6 py-4"><StatusBadge value={s.estado} /></td>
                  <td className="px-6 py-4 text-right">
                    {s.estado === "ABIERTA" && (
                      <button onClick={() => { setCloseForm({ saldoRealCierre: "" }); setCloseModal(s); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg cursor-pointer ml-auto">
                        <DoorClosed className="w-3.5 h-3.5" /> Cerrar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open session modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Abrir Sesión de Caja">
        <form onSubmit={handleOpen} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Caja</label>
            <select value={openForm.cajaId} onChange={(e) => setOpenForm({ ...openForm, cajaId: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
              {cajas.filter((c) => c.estado === "ACTIVA").map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Saldo Inicial</label>
            <input type="number" min="0" step="0.01" value={openForm.saldoInicial} onChange={(e) => setOpenForm({ ...openForm, saldoInicial: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpenModal(false)} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
            <button type="submit" className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg cursor-pointer">Abrir Sesión</button>
          </div>
        </form>
      </Modal>

      {/* Close session modal */}
      <Modal open={closeModal !== null} onClose={() => setCloseModal(null)} title="Cerrar Sesión de Caja">
        <form onSubmit={handleClose} className="space-y-4">
          <p className="text-sm text-slate-500">Caja: <strong>{closeModal ? cajaName(closeModal.cajaId) : ""}</strong></p>
          <p className="text-sm text-slate-500">Saldo inicial: <strong>{closeModal ? fmt(closeModal.saldoInicial) : ""}</strong></p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Saldo Real al Cierre</label>
            <input type="number" min="0" step="0.01" value={closeForm.saldoRealCierre} onChange={(e) => setCloseForm({ saldoRealCierre: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCloseModal(null)} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
            <button type="submit" className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg cursor-pointer">Cerrar Sesión</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
