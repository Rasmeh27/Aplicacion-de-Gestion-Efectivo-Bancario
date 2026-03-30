import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Coins } from "lucide-react";
import { cajasApi, sucursalesApi, usuariosApi } from "../../services/api";
import { generateCajaCodePreview } from "../../services/code-preview";
import type { Cashbox, CashboxPayload, Sucursal, User } from "../../types";
import { alertError, alertWarning, confirmAction } from "../../utils/alerts";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/ui/StatusBadge";

const CURRENCY_OPTIONS = [
  { value: "", label: "Todas las monedas" },
  { value: "DOP", label: "DOP (Peso dominicano)" },
  { value: "USD", label: "USD (Dolar)" },
  { value: "EUR", label: "EUR (Euro)" },
];

type CashboxFormState = {
  sucursalId: string;
  codigo: string;
  nombre: string;
  estado: Cashbox["estado"];
  moneda: string;
  limiteOperativo: string;
  responsableId: string;
};

const DEFAULT_FORM: CashboxFormState = {
  sucursalId: "",
  codigo: "",
  nombre: "",
  estado: "ACTIVA",
  moneda: "DOP",
  limiteOperativo: "",
  responsableId: "",
};

export default function CajasPage() {
  const [cajas, setCajas] = useState<Cashbox[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [modal, setModal] = useState<{ open: boolean; editing: Cashbox | null }>({
    open: false,
    editing: null,
  });
  const [form, setForm] = useState<CashboxFormState>(DEFAULT_FORM);
  const [codigoManual, setCodigoManual] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([cajasApi.list(), sucursalesApi.list(), usuariosApi.list()])
      .then(([c, s, u]) => {
        setCajas(c);
        setSucursales(s);
        setUsuarios(u);
      })
      .catch((error) => {
        console.error("Error cargando cajas:", error);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const eligibleUsers = useMemo(() => {
    return usuarios.filter(
      (user) =>
        user.status === "ACTIVO" &&
        user.sucursalDefaultId === form.sucursalId
    );
  }, [usuarios, form.sucursalId]);

  useEffect(() => {
    if (!form.responsableId) return;

    const stillValid = eligibleUsers.some(
      (user) => user.id === form.responsableId
    );

    if (!stillValid) {
      setForm((current) => ({ ...current, responsableId: "" }));
    }
  }, [eligibleUsers, form.responsableId]);

  const sucursalName = (id: string) =>
    sucursales.find((s) => s.id === id)?.nombre ?? id.slice(0, 8);

  const filtered = cajas.filter((caja) => {
    if (currencyFilter && caja.moneda !== currencyFilter) return false;

    const term = search.trim().toLowerCase();
    if (!term) return true;

    return [
      caja.nombre,
      caja.codigo,
      caja.responsableNombre ?? "",
      caja.responsableEmail ?? "",
    ].some((value) => value.toLowerCase().includes(term));
  });

  const openCreate = () => {
    setForm({
      ...DEFAULT_FORM,
      sucursalId: sucursales[0]?.id ?? "",
    });
    setCodigoManual(false);
    setModal({ open: true, editing: null });
  };

  const openEdit = (caja: Cashbox) => {
    setForm({
      sucursalId: caja.sucursalId,
      codigo: caja.codigo,
      nombre: caja.nombre,
      estado: caja.estado,
      moneda: caja.moneda,
      limiteOperativo: String(caja.limiteOperativo),
      responsableId: caja.responsableId ?? "",
    });
    setCodigoManual(true);
    setModal({ open: true, editing: caja });
  };

  const closeModal = () => {
    setModal({ open: false, editing: null });
    setForm(DEFAULT_FORM);
    setCodigoManual(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const limiteOperativo = Number(form.limiteOperativo);
    if (Number.isNaN(limiteOperativo) || limiteOperativo < 0) {
      await alertWarning("Valor inválido", "El límite operativo debe ser un número válido.");
      return;
    }

    const body: CashboxPayload = {
      sucursalId: form.sucursalId,
      nombre: form.nombre.trim(),
      estado: form.estado,
      moneda: form.moneda,
      limiteOperativo,
      responsableId: form.responsableId || null,
    };

    try {
      if (modal.editing) {
        body.codigo = form.codigo.trim().toUpperCase();
        await cajasApi.update(modal.editing.id, body);
      } else {
        if (codigoManual && form.codigo.trim()) {
          body.codigo = form.codigo.trim().toUpperCase();
        }
        await cajasApi.create(body);
      }

      closeModal();
      load();
    } catch (error) {
      console.error("Error guardando caja:", error);
      await alertError("Error", "No se pudo guardar la caja.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction("¿Eliminar esta caja?", "Esta acción no se puede deshacer.", "Sí, eliminar"))) return;

    try {
      await cajasApi.delete(id);
      load();
    } catch (error) {
      console.error("Error eliminando caja:", error);
      await alertError("Error", "No se pudo eliminar la caja.");
    }
  };

  const fmt = (n: number, currency = "DOP") =>
    new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency,
    }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cajas</h1>
          <p className="text-sm text-slate-500">Gestión de cajas y ventanillas</p>
        </div>

        <button
          onClick={openCreate}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Nueva Caja
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por caja o responsable..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div className="relative">
          <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Código</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Nombre</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Sucursal</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Responsable</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Moneda</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Límite</th>
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
                    Sin resultados
                  </td>
                </tr>
              ) : (
                filtered.map((caja) => (
                  <tr key={caja.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-slate-700">{caja.codigo}</td>
                    <td className="px-6 py-4 text-slate-700">{caja.nombre}</td>
                    <td className="px-6 py-4 text-slate-500">{sucursalName(caja.sucursalId)}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {caja.responsableNombre ? (
                        <div>
                          <div className="text-slate-700">{caja.responsableNombre}</div>
                          {caja.responsableEmail && (
                            <div className="text-xs text-slate-400">
                              {caja.responsableEmail}
                            </div>
                          )}
                        </div>
                      ) : (
                        "Sin asignar"
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{caja.moneda}</td>
                    <td className="px-6 py-4 text-slate-700">
                      {fmt(caja.limiteOperativo, caja.moneda)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge value={caja.estado} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(caja)}
                          className="cursor-pointer rounded-lg p-2 hover:bg-slate-100"
                        >
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(caja.id)}
                          className="cursor-pointer rounded-lg p-2 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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

      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.editing ? "Editar Caja" : "Nueva Caja"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Sucursal
            </label>
            <select
              value={form.sucursalId}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  sucursalId: e.target.value,
                }))
              }
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {sucursales.map((sucursal) => (
                <option key={sucursal.id} value={sucursal.id}>
                  {sucursal.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Código
              </label>

              {modal.editing ? (
                <input
                  value={form.codigo}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      codigo: e.target.value,
                    }))
                  }
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              ) : codigoManual ? (
                <div className="space-y-1">
                  <input
                    value={form.codigo}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        codigo: e.target.value,
                      }))
                    }
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCodigoManual(false);
                      setForm((prev) => ({ ...prev, codigo: "" }));
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Volver a código automático
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-400">
                    {generateCajaCodePreview(
                      sucursales.find((s) => s.id === form.sucursalId)?.codigo,
                      form.moneda
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCodigoManual(true)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Editar código manualmente
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nombre
              </label>
              <input
                value={form.nombre}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    nombre: e.target.value,
                  }))
                }
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Moneda
              </label>
              <select
                value={form.moneda}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    moneda: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="DOP">DOP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Límite Operativo
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.limiteOperativo}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    limiteOperativo: e.target.value,
                  }))
                }
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Estado
              </label>
              <select
                value={form.estado}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    estado: e.target.value as Cashbox["estado"],
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="ACTIVA">ACTIVA</option>
                <option value="INACTIVA">INACTIVA</option>
                <option value="EN_MANTENIMIENTO">EN_MANTENIMIENTO</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Responsable
              </label>
              <select
                value={form.responsableId}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    responsableId: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">— Sin asignar —</option>
                {eligibleUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.email}
                  </option>
                ))}
              </select>

              {form.sucursalId && eligibleUsers.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  No hay usuarios activos elegibles para esta sucursal.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="cursor-pointer rounded-lg px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              {modal.editing ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}