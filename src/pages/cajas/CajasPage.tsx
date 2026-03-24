import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { cajasApi, sucursalesApi } from "../../services/api";
import type { Cashbox, Sucursal } from "../../types";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/ui/StatusBadge";

export default function CajasPage() {
  const [cajas, setCajas] = useState<Cashbox[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; editing: Cashbox | null }>({ open: false, editing: null });
  const [form, setForm] = useState({ sucursalId: "", codigo: "", nombre: "", estado: "ACTIVA", moneda: "DOP", limiteOperativo: "" });

  const load = () => {
    setLoading(true);
    Promise.all([cajasApi.list(), sucursalesApi.list()])
      .then(([c, s]) => { setCajas(c); setSucursales(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const sucursalName = (id: string) => sucursales.find((s) => s.id === id)?.nombre ?? id.slice(0, 8);

  const filtered = cajas.filter(
    (c) =>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setForm({ sucursalId: sucursales[0]?.id ?? "", codigo: "", nombre: "", estado: "ACTIVA", moneda: "DOP", limiteOperativo: "" });
    setModal({ open: true, editing: null });
  };

  const openEdit = (c: Cashbox) => {
    setForm({ sucursalId: c.sucursalId, codigo: c.codigo, nombre: c.nombre, estado: c.estado, moneda: c.moneda, limiteOperativo: String(c.limiteOperativo) });
    setModal({ open: true, editing: c });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { ...form, limiteOperativo: Number(form.limiteOperativo) };
    if (modal.editing) {
      await cajasApi.update(modal.editing.id, body);
    } else {
      await cajasApi.create(body);
    }
    setModal({ open: false, editing: null });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta caja?")) return;
    await cajasApi.delete(id);
    load();
  };

  const fmt = (n: number) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cajas</h1>
          <p className="text-slate-500 text-sm">Gestión de cajas y ventanillas</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
          <Plus className="w-4 h-4" /> Nueva Caja
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Código</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Nombre</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Sucursal</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Moneda</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Límite</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Sin resultados</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-700">{c.codigo}</td>
                  <td className="px-6 py-4 text-slate-700">{c.nombre}</td>
                  <td className="px-6 py-4 text-slate-500">{sucursalName(c.sucursalId)}</td>
                  <td className="px-6 py-4 text-slate-500">{c.moneda}</td>
                  <td className="px-6 py-4 text-slate-700">{fmt(c.limiteOperativo)}</td>
                  <td className="px-6 py-4"><StatusBadge value={c.estado} /></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer"><Pencil className="w-4 h-4 text-slate-500" /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false, editing: null })} title={modal.editing ? "Editar Caja" : "Nueva Caja"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sucursal</label>
            <select value={form.sucursalId} onChange={(e) => setForm({ ...form, sucursalId: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
              {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
              {modal.editing ? (
                <p className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 font-mono">{form.codigo}</p>
              ) : (
                <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
              <select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value="DOP">DOP</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Límite Operativo</label>
              <input type="number" min="0" step="0.01" value={form.limiteOperativo} onChange={(e) => setForm({ ...form, limiteOperativo: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
            <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
              <option value="ACTIVA">ACTIVA</option><option value="INACTIVA">INACTIVA</option><option value="EN_MANTENIMIENTO">EN_MANTENIMIENTO</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal({ open: false, editing: null })} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
            <button type="submit" className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg cursor-pointer">{modal.editing ? "Guardar" : "Crear"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
