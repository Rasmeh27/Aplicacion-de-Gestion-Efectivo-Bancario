import { useEffect, useState } from "react";
import { Plus, Search, Pencil, UserX } from "lucide-react";
import { usuariosApi, rolesApi, sucursalesApi } from "../../services/api";
import type { User, Role, Sucursal } from "../../types";
import { confirmAction } from "../../utils/alerts";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/ui/StatusBadge";

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; editing: User | null }>({ open: false, editing: null });
  const [form, setForm] = useState({ name: "", email: "", password: "", sucursalDefaultId: "", roleIds: [] as string[] });

  const load = () => {
    setLoading(true);
    Promise.all([usuariosApi.list(), rolesApi.list(), sucursalesApi.list()])
      .then(([u, r, s]) => {
        setUsuarios(Array.isArray(u) ? u : []);
        setRoles(Array.isArray(r) ? r : []);
        setSucursales(Array.isArray(s) ? s : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const roleName = (ids: string[]) => ids.map((id) => roles.find((r) => r.id === id)?.nombre ?? id.slice(0, 6)).join(", ");
  const sucName = (id: string | null) => id ? (sucursales.find((s) => s.id === id)?.nombre ?? id.slice(0, 8)) : "—";

  const filtered = usuarios.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setForm({ name: "", email: "", password: "", sucursalDefaultId: "", roleIds: [] });
    setModal({ open: true, editing: null });
  };

  const openEdit = (u: User) => {
    setForm({ name: u.name, email: u.email, password: "", sucursalDefaultId: u.sucursalDefaultId ?? "", roleIds: u.roleIds });
    setModal({ open: true, editing: u });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal.editing) {
      const body: Record<string, unknown> = { name: form.name, email: form.email, roleIds: form.roleIds };
      if (form.sucursalDefaultId) body.sucursalDefaultId = form.sucursalDefaultId;
      await usuariosApi.update(modal.editing.id, body);
    } else {
      await usuariosApi.create({ ...form, sucursalDefaultId: form.sucursalDefaultId || undefined });
    }
    setModal({ open: false, editing: null });
    load();
  };

  const handleDeactivate = async (id: string) => {
    if (!(await confirmAction("¿Desactivar este usuario?", "El usuario no podrá acceder al sistema.", "Sí, desactivar"))) return;
    await usuariosApi.deactivate(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
          <p className="text-slate-500 text-sm">Gestión de usuarios y permisos del sistema</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Buscar por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Nombre</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Email</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Roles</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Sucursal</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Sin usuarios</td></tr>
              ) : filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{u.name}</td>
                  <td className="px-6 py-4 text-slate-500">{u.email}</td>
                  <td className="px-6 py-4 text-slate-600 text-xs">{roleName(u.roleIds) || "—"}</td>
                  <td className="px-6 py-4 text-slate-500">{sucName(u.sucursalDefaultId)}</td>
                  <td className="px-6 py-4"><StatusBadge value={u.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer"><Pencil className="w-4 h-4 text-slate-500" /></button>
                      {u.status === "ACTIVO" && (
                        <button onClick={() => handleDeactivate(u.id)} className="p-2 hover:bg-red-50 rounded-lg cursor-pointer" title="Desactivar"><UserX className="w-4 h-4 text-red-500" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false, editing: null })} title={modal.editing ? "Editar Usuario" : "Nuevo Usuario"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          {!modal.editing && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sucursal</label>
            <select value={form.sucursalDefaultId} onChange={(e) => setForm({ ...form, sucursalDefaultId: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
              <option value="">— Sin asignar —</option>
              {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Roles</label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.roleIds.includes(r.id)} onChange={(e) => {
                    setForm({ ...form, roleIds: e.target.checked ? [...form.roleIds, r.id] : form.roleIds.filter((id) => id !== r.id) });
                  }} className="w-4 h-4 rounded border-slate-300" />
                  <span className="text-sm text-slate-700">{r.nombre}</span>
                </label>
              ))}
            </div>
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
