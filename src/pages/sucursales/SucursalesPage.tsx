import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { sucursalesApi } from "../../services/api";
import type { Sucursal } from "../../types";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/ui/StatusBadge";

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; editing: Sucursal | null }>({
    open: false,
    editing: null,
  });
  const [form, setForm] = useState({ codigo: "", nombre: "", estado: "ACTIVA" });

  const load = () => {
    setLoading(true);
    sucursalesApi.list().then(setSucursales).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = sucursales.filter(
    (s) =>
      s.nombre.toLowerCase().includes(search.toLowerCase()) ||
      s.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setForm({ codigo: "", nombre: "", estado: "ACTIVA" });
    setModal({ open: true, editing: null });
  };

  const openEdit = (s: Sucursal) => {
    setForm({ codigo: s.codigo, nombre: s.nombre, estado: s.estado });
    setModal({ open: true, editing: s });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal.editing) {
      await sucursalesApi.update(modal.editing.id, form);
    } else {
      await sucursalesApi.create(form);
    }
    setModal({ open: false, editing: null });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta sucursal?")) return;
    await sucursalesApi.delete(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sucursales</h1>
          <p className="text-slate-500 text-sm">Gestión de sucursales del banco</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
          <Plus className="w-4 h-4" /> Nueva Sucursal
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Código</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Nombre</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Sin resultados</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-700">{s.codigo}</td>
                    <td className="px-6 py-4 text-slate-700">{s.nombre}</td>
                    <td className="px-6 py-4"><StatusBadge value={s.estado} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer" title="Editar">
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-red-50 rounded-lg cursor-pointer" title="Eliminar">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? "Editar Sucursal" : "Nueva Sucursal"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
            <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
            <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
              <option value="ACTIVA">ACTIVA</option>
              <option value="INACTIVA">INACTIVA</option>
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
