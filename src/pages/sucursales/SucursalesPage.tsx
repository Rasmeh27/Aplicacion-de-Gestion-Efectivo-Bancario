import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  Landmark,
  MapPin,
  MonitorSmartphone,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { atmApi, cajasApi, sesionesApi, sucursalesApi } from "../../services/api";
import { geocodeDominicanAddress } from "../../services/geocoding";
import { generateSucursalCodePreview, generateAtmCodePreview } from "../../services/code-preview";
import type {
  AtmMovement,
  AtmOperationResult,
  AtmOperationType,
  AtmRecord,
  Cashbox,
  CashboxSession,
  Sucursal,
} from "../../types";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/ui/StatusBadge";
import { confirmAction } from "../../utils/alerts";

type BranchFormState = {
  codigo: string;
  nombre: string;
  estado: "ACTIVA" | "INACTIVA";
  telefono: string;
  direccion: string;
};

type OperationModalState = {
  open: boolean;
  type: AtmOperationType;
  atm: AtmRecord | null;
};

type OperationFormState = {
  monto: string;
  sesionCajaId: string;
  referencia: string;
  observacion: string;
};

type CreateAtmFormState = {
  codigo: string;
  nombre: string;
  cajaId: string;
  balanceInicial: string;
  moneda: string;
  estado: "ACTIVO" | "INACTIVO" | "EN_MANTENIMIENTO";
};

const EMPTY_FORM: BranchFormState = {
  codigo: "",
  nombre: "",
  estado: "ACTIVA",
  telefono: "",
  direccion: "",
};

const EMPTY_OPERATION_FORM: OperationFormState = {
  monto: "",
  sesionCajaId: "",
  referencia: "",
  observacion: "",
};

const EMPTY_CREATE_ATM_FORM: CreateAtmFormState = {
  codigo: "",
  nombre: "",
  cajaId: "",
  balanceInicial: "",
  moneda: "DOP",
  estado: "ACTIVO",
};

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submittingBranch, setSubmittingBranch] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; editing: Sucursal | null }>({
    open: false,
    editing: null,
  });
  const [form, setForm] = useState<BranchFormState>(EMPTY_FORM);

  const [cajasAsignadas, setCajasAsignadas] = useState<Cashbox[]>([]);
  const [cajasDisponibles, setCajasDisponibles] = useState<Cashbox[]>([]);
  const [cajasOriginales, setCajasOriginales] = useState<Cashbox[]>([]);
  const [cajasLoading, setCajasLoading] = useState(false);
  const [branchAtmsInEditor, setBranchAtmsInEditor] = useState<AtmRecord[]>([]);

  const [atmModalOpen, setAtmModalOpen] = useState(false);
  const [selectedSucursal, setSelectedSucursal] = useState<Sucursal | null>(null);
  const [atms, setAtms] = useState<AtmRecord[]>([]);
  const [atmsLoading, setAtmsLoading] = useState(false);
  const [atmError, setAtmError] = useState("");
  const [atmMovements, setAtmMovements] = useState<Record<string, AtmMovement[]>>({});
  const [expandedMovementAtmIds, setExpandedMovementAtmIds] = useState<Record<string, boolean>>({});
  const [movementLoadingByAtm, setMovementLoadingByAtm] = useState<Record<string, boolean>>({});

  const [operationModal, setOperationModal] = useState<OperationModalState>({
    open: false,
    type: "deposit",
    atm: null,
  });
  const [operationForm, setOperationForm] = useState<OperationFormState>(EMPTY_OPERATION_FORM);
  const [operationSessions, setOperationSessions] = useState<CashboxSession[]>([]);
  const [operationLoading, setOperationLoading] = useState(false);
  const [operationSubmitting, setOperationSubmitting] = useState(false);
  const [operationError, setOperationError] = useState("");

  const [createAtmModalOpen, setCreateAtmModalOpen] = useState(false);
  const [createAtmForm, setCreateAtmForm] = useState<CreateAtmFormState>(EMPTY_CREATE_ATM_FORM);
  const [createAtmError, setCreateAtmError] = useState("");
  const [createAtmSubmitting, setCreateAtmSubmitting] = useState(false);
  const [createAtmLoading, setCreateAtmLoading] = useState(false);
  const [createAtmCashboxes, setCreateAtmCashboxes] = useState<Cashbox[]>([]);

  const [branchCodigoManual, setBranchCodigoManual] = useState(false);
  const [atmCodigoManual, setAtmCodigoManual] = useState(false);

  const syncSelectedSucursal = (items: Sucursal[], preferredId?: string) => {
    const targetId = preferredId ?? selectedSucursal?.id;
    if (!targetId) return;

    const updated = items.find((branch) => branch.id === targetId) ?? null;
    if (updated) {
      setSelectedSucursal(updated);
    }
  };

  const loadSucursales = async (showLoader = true, preferredId?: string) => {
    if (showLoader) setLoading(true);
    try {
      const result = await sucursalesApi.list();
      setSucursales(result);
      syncSelectedSucursal(result, preferredId);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    void loadSucursales();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sucursales;

    return sucursales.filter((branch) => {
      return [branch.nombre, branch.codigo, branch.telefono ?? "", branch.direccion ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [search, sucursales]);

  const totalAtms = useMemo(
    () => sucursales.reduce((acc, branch) => acc + Number(branch.cantidadAtm ?? 0), 0),
    [sucursales]
  );

  const totalEfectivo = useMemo(
    () => sucursales.reduce((acc, branch) => acc + Number(branch.total ?? 0), 0),
    [sucursales]
  );

  const openCreate = async () => {
    setForm(EMPTY_FORM);
    setBranchCodigoManual(false);
    setCajasAsignadas([]);
    setCajasOriginales([]);
    setBranchAtmsInEditor([]);
    setSubmitError("");
    setModal({ open: true, editing: null });
    setCajasLoading(true);

    try {
      const todas = await cajasApi.list();
      setCajasDisponibles(todas.filter((cashbox) => !cashbox.sucursalId));
    } catch {
      setCajasDisponibles([]);
    } finally {
      setCajasLoading(false);
    }
  };

  const openEdit = async (branch: Sucursal) => {
    setForm({
      codigo: branch.codigo,
      nombre: branch.nombre,
      estado: branch.estado,
      telefono: branch.telefono ?? "",
      direccion: branch.direccion ?? "",
    });
    setSubmitError("");
    setModal({ open: true, editing: branch });
    setCajasLoading(true);

    try {
      const [todas, branchAtms] = await Promise.all([cajasApi.list(), sucursalesApi.listAtms(branch.id)]);
      const asignadas = todas.filter((cashbox) => cashbox.sucursalId === branch.id);
      const disponibles = todas.filter((cashbox) => !cashbox.sucursalId);
      setCajasAsignadas(asignadas);
      setCajasDisponibles(disponibles);
      setCajasOriginales(asignadas);
      setBranchAtmsInEditor(branchAtms);
    } catch {
      setCajasAsignadas([]);
      setCajasDisponibles([]);
      setCajasOriginales([]);
      setBranchAtmsInEditor([]);
    } finally {
      setCajasLoading(false);
    }
  };

  const agregarCaja = (caja: Cashbox) => {
    setCajasDisponibles((prev) => prev.filter((item) => item.id !== caja.id));
    setCajasAsignadas((prev) => [...prev, caja]);
  };

  const quitarCaja = (caja: Cashbox) => {
    const atmLinked = branchAtmsInEditor.find((atm) => atm.cajaId === caja.id);
    if (atmLinked) {
      setSubmitError(`No puedes quitar la caja ${caja.codigo} porque ya está asociada al ATM ${atmLinked.codigo}.`);
      return;
    }

    setCajasAsignadas((prev) => prev.filter((item) => item.id !== caja.id));
    setCajasDisponibles((prev) => [...prev, { ...caja, sucursalId: "" }]);
  };

  const buildBranchPayload = async (editing: boolean) => {
    const payload: Record<string, unknown> = {
      nombre: form.nombre.trim(),
      estado: form.estado,
    };

    if (editing || branchCodigoManual) {
      const trimmed = form.codigo.trim().toUpperCase();
      if (trimmed) payload.codigo = trimmed;
    }

    const telefono = form.telefono.trim();
    const direccion = form.direccion.trim();

    if (editing) {
      payload.telefono = telefono || null;
      payload.direccion = direccion || null;
    } else {
      if (telefono) payload.telefono = telefono;
      if (direccion) payload.direccion = direccion;
    }

    if (direccion) {
      const coords = await geocodeDominicanAddress(direccion);
      payload.latitud = coords.latitud;
      payload.longitud = coords.longitud;
    } else if (editing) {
      payload.latitud = null;
      payload.longitud = null;
    }

    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmittingBranch(true);

    try {
      const payload = await buildBranchPayload(Boolean(modal.editing));

      if (modal.editing) {
        await sucursalesApi.update(modal.editing.id, payload);

        const agregadas = cajasAsignadas.filter(
          (cashbox) => !cajasOriginales.find((original) => original.id === cashbox.id)
        );
        const removidas = cajasOriginales.filter(
          (original) => !cajasAsignadas.find((cashbox) => cashbox.id === original.id)
        );

        await Promise.all([
          ...agregadas.map((cashbox) =>
            cajasApi.update(cashbox.id, { ...cashbox, sucursalId: modal.editing!.id })
          ),
          ...removidas.map((cashbox) => cajasApi.update(cashbox.id, { ...cashbox, sucursalId: "" })),
        ]);
      } else {
        const nueva = await sucursalesApi.create(payload as Parameters<typeof sucursalesApi.create>[0]);
        await Promise.all(
          cajasAsignadas.map((cashbox) => cajasApi.update(cashbox.id, { ...cashbox, sucursalId: nueva.id }))
        );
      }

      setModal({ open: false, editing: null });
      setForm(EMPTY_FORM);
      setBranchAtmsInEditor([]);
      await loadSucursales();
    } catch (error) {
      setSubmitError(readError(error, "No se pudo guardar la sucursal."));
    } finally {
      setSubmittingBranch(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction("¿Eliminar esta sucursal?", "Esta acción no se puede deshacer.", "Sí, eliminar"))) return;

    try {
      await sucursalesApi.delete(id);
      await loadSucursales();
    } catch (error) {
      setSubmitError(readError(error, "No se pudo eliminar la sucursal."));
    }
  };

  const openAtmModal = async (branch: Sucursal) => {
    setAtmModalOpen(true);
    setSelectedSucursal(branch);
    setAtmError("");
    setAtms([]);
    setAtmMovements({});
    setExpandedMovementAtmIds({});
    setMovementLoadingByAtm({});
    setAtmsLoading(true);

    try {
      const items = await sucursalesApi.listAtms(branch.id);
      setAtms(items);
    } catch (error) {
      setAtmError(readError(error, "No se pudieron cargar los ATM de la sucursal."));
    } finally {
      setAtmsLoading(false);
    }
  };

  const reloadAtms = async (branchId: string) => {
    const items = await sucursalesApi.listAtms(branchId);
    setAtms(items);
    return items;
  };

  const toggleMovements = async (atmId: string) => {
    const isExpanded = Boolean(expandedMovementAtmIds[atmId]);
    setExpandedMovementAtmIds((prev) => ({ ...prev, [atmId]: !isExpanded }));

    if (isExpanded || atmMovements[atmId]) {
      return;
    }

    setMovementLoadingByAtm((prev) => ({ ...prev, [atmId]: true }));
    try {
      const items = await atmApi.movimientos(atmId);
      setAtmMovements((prev) => ({ ...prev, [atmId]: items }));
    } catch (error) {
      setAtmError(readError(error, "No se pudieron cargar los movimientos del ATM."));
    } finally {
      setMovementLoadingByAtm((prev) => ({ ...prev, [atmId]: false }));
    }
  };

  const openOperationModal = async (type: AtmOperationType, atm: AtmRecord) => {
    setOperationModal({ open: true, type, atm });
    setOperationForm(EMPTY_OPERATION_FORM);
    setOperationError("");
    setOperationSessions([]);
    setOperationLoading(true);

    try {
      const sessions = await sesionesApi.list({ cajaId: atm.cajaId, estado: "ABIERTA" });
      setOperationSessions(sessions);
      setOperationForm((prev) => ({
        ...prev,
        sesionCajaId: sessions[0]?.id ?? "",
      }));
    } catch (error) {
      setOperationError(readError(error, "No se pudieron cargar las sesiones abiertas de la caja."));
    } finally {
      setOperationLoading(false);
    }
  };

  const closeOperationModal = () => {
    setOperationModal({ open: false, type: "deposit", atm: null });
    setOperationForm(EMPTY_OPERATION_FORM);
    setOperationSessions([]);
    setOperationError("");
    setOperationLoading(false);
    setOperationSubmitting(false);
  };

  const applyOperationResult = (result: AtmOperationResult) => {
    setAtms((prev) => prev.map((atm) => (atm.id === result.atm.id ? result.atm : atm)));
    setAtmMovements((prev) => ({
      ...prev,
      [result.atm.id]: [result.movimiento, ...(prev[result.atm.id] ?? [])],
    }));
    setExpandedMovementAtmIds((prev) => ({ ...prev, [result.atm.id]: true }));
    setSucursales((prev) =>
      prev.map((branch) =>
        branch.id === result.atm.sucursalId ? { ...branch, total: result.sucursalTotal } : branch
      )
    );
  };

  const handleOperationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!operationModal.atm) {
      setOperationError("Debes seleccionar un ATM válido.");
      return;
    }

    if (!operationForm.sesionCajaId) {
      setOperationError("Debes seleccionar una sesión abierta para la caja asociada.");
      return;
    }

    setOperationError("");
    setOperationSubmitting(true);

    try {
      const body = {
        monto: Number(operationForm.monto),
        sesionCajaId: operationForm.sesionCajaId,
        referencia: operationForm.referencia.trim() || undefined,
        observacion: operationForm.observacion.trim() || undefined,
        sucursalId: operationModal.atm.sucursalId,
        cajaId: operationModal.atm.cajaId,
      };

      const result =
        operationModal.type === "deposit"
          ? await atmApi.deposit(operationModal.atm.id, body)
          : await atmApi.withdraw(operationModal.atm.id, body);

      applyOperationResult(result);

      if (selectedSucursal) {
        await Promise.all([loadSucursales(false, selectedSucursal.id), reloadAtms(selectedSucursal.id)]);
      }

      closeOperationModal();
    } catch (error) {
      setOperationError(readError(error, "No se pudo completar la operación del ATM."));
    } finally {
      setOperationSubmitting(false);
    }
  };

  const openCreateAtmModal = async () => {
    if (!selectedSucursal) return;

    setCreateAtmModalOpen(true);
    setCreateAtmForm(EMPTY_CREATE_ATM_FORM);
    setAtmCodigoManual(false);
    setCreateAtmError("");
    setCreateAtmLoading(true);
    setCreateAtmCashboxes([]);

    try {
      const cashboxes = await cajasApi.list();
      const occupiedCashboxIds = new Set(atms.map((atm) => atm.cajaId));
      const available = cashboxes.filter(
        (cashbox) => cashbox.sucursalId === selectedSucursal.id && !occupiedCashboxIds.has(cashbox.id)
      );

      setCreateAtmCashboxes(available);
      setCreateAtmForm((prev) => ({ ...prev, cajaId: available[0]?.id ?? "" }));
    } catch (error) {
      setCreateAtmError(readError(error, "No se pudieron cargar las cajas disponibles para el ATM."));
    } finally {
      setCreateAtmLoading(false);
    }
  };

  const closeCreateAtmModal = () => {
    setCreateAtmModalOpen(false);
    setCreateAtmForm(EMPTY_CREATE_ATM_FORM);
    setCreateAtmError("");
    setCreateAtmSubmitting(false);
    setCreateAtmLoading(false);
    setCreateAtmCashboxes([]);
  };

  const handleCreateAtmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSucursal) {
      setCreateAtmError("Debes seleccionar una sucursal válida.");
      return;
    }

    if (!createAtmForm.cajaId) {
      setCreateAtmError("Debes seleccionar una caja disponible para el ATM.");
      return;
    }

    setCreateAtmSubmitting(true);
    setCreateAtmError("");

    try {
      const atmPayload: Parameters<typeof atmApi.create>[0] = {
        sucursalId: selectedSucursal.id,
        cajaId: createAtmForm.cajaId,
        nombre: createAtmForm.nombre.trim(),
        balanceInicial: Number(createAtmForm.balanceInicial),
        moneda: createAtmForm.moneda,
        estado: createAtmForm.estado,
      };
      if (atmCodigoManual && createAtmForm.codigo.trim()) {
        atmPayload.codigo = createAtmForm.codigo.trim().toUpperCase();
      }
      await atmApi.create(atmPayload);

      await Promise.all([loadSucursales(false, selectedSucursal.id), reloadAtms(selectedSucursal.id)]);
      closeCreateAtmModal();
    } catch (error) {
      setCreateAtmError(readError(error, "No se pudo registrar el ATM."));
    } finally {
      setCreateAtmSubmitting(false);
    }
  };

  const branchMapLink = (branch: Sucursal) => {
    if (branch.direccion?.trim()) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.direccion)}`;
    }

    if (branch.latitud != null && branch.longitud != null) {
      return `https://www.google.com/maps?q=${branch.latitud},${branch.longitud}`;
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Sucursales" value={String(sucursales.length)} helper="Total registradas" />
        <StatCard label="ATM vinculados" value={String(totalAtms)} helper="Suma derivada por sucursal" />
        <StatCard label="Efectivo consolidado" value={formatMoney(totalEfectivo)} helper="Total expuesto por API" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sucursales</h1>
          <p className="text-sm text-slate-500">Gestión de sucursales, ubicación, contacto y operación de ATM.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> Nueva Sucursal
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, código, teléfono o dirección..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Sucursal</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Contacto</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Ubicación</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Total</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">ATM</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Estado</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Cargando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Sin resultados
                  </td>
                </tr>
              ) : (
                filtered.map((branch) => {
                  const mapLink = branchMapLink(branch);

                  return (
                    <tr key={branch.id} className="align-top transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-800">{branch.nombre}</p>
                          <p className="font-mono text-xs text-slate-500">{branch.codigo}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2 text-slate-600">
                          <InfoRow icon={<Phone className="h-3.5 w-3.5" />}>
                            {branch.telefono ? (
                              <a className="hover:text-slate-900" href={`tel:${branch.telefono}`}>
                                {branch.telefono}
                              </a>
                            ) : (
                              "Sin teléfono"
                            )}
                          </InfoRow>
                          <InfoRow icon={<MapPin className="h-3.5 w-3.5" />}>
                            {branch.direccion || "Sin dirección"}
                          </InfoRow>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {branch.direccion ? (
                          <div className="space-y-1">
                            <p className="line-clamp-2 max-w-xs text-sm text-slate-700">{branch.direccion}</p>
                            {mapLink && (
                              <a
                                href={mapLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                              >
                                <MapPin className="h-3 w-3" /> Ver mapa
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Sin dirección</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">{formatMoney(branch.total ?? 0)}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <p className="text-slate-700">{branch.cantidadAtm ?? 0} ATM</p>
                          <button
                            type="button"
                            onClick={() => openAtmModal(branch)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                          >
                            <MonitorSmartphone className="h-3.5 w-3.5" /> Ver ATM
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge value={branch.estado} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(branch)}
                            className="rounded-lg p-2 hover:bg-slate-100"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(branch.id)}
                            className="rounded-lg p-2 hover:bg-red-50"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? "Editar Sucursal" : "Nueva Sucursal"}
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Código</label>
              {modal.editing ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-500">
                  {form.codigo}
                </p>
              ) : branchCodigoManual ? (
                <div className="space-y-1">
                  <input
                    value={form.codigo}
                    onChange={(e) => setForm((prev) => ({ ...prev, codigo: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => { setBranchCodigoManual(false); setForm((prev) => ({ ...prev, codigo: "" })); }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Volver a código automático
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-400">
                    {form.nombre.trim() ? generateSucursalCodePreview(form.nombre) : "Se generará automáticamente"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setBranchCodigoManual(true)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Editar código manualmente
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm((prev) => ({ ...prev, estado: e.target.value as BranchFormState["estado"] }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="ACTIVA">ACTIVA</option>
                <option value="INACTIVA">INACTIVA</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
              <input
                value={form.telefono}
                onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
                placeholder="809-555-0100"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Dirección</label>
              <input
                value={form.direccion}
                onChange={(e) => setForm((prev) => ({ ...prev, direccion: e.target.value }))}
                placeholder="Av. Principal #123, Ciudad"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            La ubicación del mapa se calculará automáticamente a partir de la dirección al guardar la sucursal.
          </div>

          <div className="space-y-2 pt-1">
            <label className="block text-sm font-medium text-slate-700">Cajas</label>
            {cajasLoading ? (
              <p className="text-sm text-slate-400">Cargando cajas...</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="min-h-[110px] space-y-1 rounded-lg border border-slate-200 p-2">
                  <p className="px-1 pb-1 text-xs font-semibold text-slate-500">Asignadas</p>
                  {cajasAsignadas.length === 0 ? (
                    <p className="px-1 text-xs text-slate-400">Ninguna</p>
                  ) : (
                    cajasAsignadas.map((cashbox) => {
                      const linkedAtm = branchAtmsInEditor.find((atm) => atm.cajaId === cashbox.id);
                      return (
                        <div
                          key={cashbox.id}
                          className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1.5"
                        >
                          <div className="min-w-0">
                            <span className="block truncate text-xs text-slate-700">{cashbox.nombre}</span>
                            {linkedAtm && (
                              <span className="text-[11px] text-amber-600">ATM asociado: {linkedAtm.codigo}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => quitarCaja(cashbox)}
                            className="ml-1 flex-shrink-0 rounded p-0.5 hover:bg-red-100"
                            title="Quitar"
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="min-h-[110px] space-y-1 rounded-lg border border-slate-200 p-2">
                  <p className="px-1 pb-1 text-xs font-semibold text-slate-500">Disponibles</p>
                  {cajasDisponibles.length === 0 ? (
                    <p className="px-1 text-xs text-slate-400">Ninguna libre</p>
                  ) : (
                    cajasDisponibles.map((cashbox) => (
                      <div
                        key={cashbox.id}
                        className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1.5"
                      >
                        <span className="truncate text-xs text-slate-700">{cashbox.nombre}</span>
                        <button
                          type="button"
                          onClick={() => agregarCaja(cashbox)}
                          className="ml-1 flex-shrink-0 rounded p-0.5 hover:bg-green-100"
                          title="Agregar"
                        >
                          <Plus className="h-3 w-3 text-green-600" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {!modal.editing && (
            <p className="text-xs text-slate-500">
              Guarda primero la sucursal y luego usa el botón <span className="font-medium">Ver ATM</span> para registrar ATM con su balance inicial.
            </p>
          )}

          {submitError && <p className="text-center text-sm text-red-500">{submitError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModal({ open: false, editing: null })}
              className="cursor-pointer rounded-lg px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submittingBranch}
              className="cursor-pointer rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingBranch ? "Guardando..." : modal.editing ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={atmModalOpen}
        onClose={() => {
          setAtmModalOpen(false);
          setSelectedSucursal(null);
          setAtmError("");
        }}
        title={selectedSucursal ? `ATM de ${selectedSucursal.nombre}` : "ATM de la sucursal"}
        size="4xl"
      >
        <div className="space-y-4">
          {selectedSucursal && (
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="grid flex-1 gap-4 md:grid-cols-4">
                <SummaryItem label="Sucursal" value={selectedSucursal.codigo} />
                <SummaryItem label="ATM" value={`${selectedSucursal.cantidadAtm ?? 0}`} />
                <SummaryItem label="Total sucursal" value={formatMoney(selectedSucursal.total ?? 0)} />
                <SummaryItem label="Dirección" value={selectedSucursal.direccion || "Sin dirección"} />
              </div>
              <button
                type="button"
                onClick={openCreateAtmModal}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" /> Agregar ATM
              </button>
            </div>
          )}

          {atmError && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{atmError}</p>}

          {atmsLoading ? (
            <p className="py-6 text-center text-sm text-slate-400">Cargando ATM...</p>
          ) : atms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
              Esta sucursal no tiene ATM registrados.
            </div>
          ) : (
            <div className="space-y-4">
              {atms.map((atm) => {
                const movements = atmMovements[atm.id] ?? [];
                const movementsOpen = Boolean(expandedMovementAtmIds[atm.id]);
                const movementLoading = Boolean(movementLoadingByAtm[atm.id]);

                return (
                  <div key={atm.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricBlock label="ATM" value={atm.nombre} helper={atm.codigo} icon={<MonitorSmartphone className="h-4 w-4" />} />
                        <MetricBlock label="Caja" value={atm.cajaNombre ?? "Sin caja"} helper={atm.cajaCodigo ?? atm.cajaId} icon={<Building2 className="h-4 w-4" />} />
                        <MetricBlock label="Balance actual" value={formatMoney(atm.balanceActual, atm.moneda)} helper={`Moneda: ${atm.moneda}`} icon={<Landmark className="h-4 w-4" />} />
                        <MetricBlock label="Límite operativo" value={formatMoney(atm.limiteOperativo, atm.moneda)} helper="Capacidad operativa" icon={<Landmark className="h-4 w-4" />} />
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <StatusBadge value={atm.estado} />
                        <button
                          type="button"
                          onClick={() => openOperationModal("deposit", atm)}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          <ArrowDownToLine className="h-3.5 w-3.5" /> Reabastecer
                        </button>
                        <button
                          type="button"
                          onClick={() => openOperationModal("withdraw", atm)}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white hover:bg-amber-600"
                        >
                          <ArrowUpFromLine className="h-3.5 w-3.5" /> Retirar
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleMovements(atm.id)}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {movementsOpen ? "Ocultar movimientos" : "Ver movimientos"}
                        </button>
                      </div>
                    </div>

                    {movementsOpen && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-slate-700">Historial ATM</h3>
                          <span className="text-xs text-slate-400">{movements.length} registro(s)</span>
                        </div>

                        {movementLoading ? (
                          <p className="py-4 text-center text-sm text-slate-400">Cargando movimientos...</p>
                        ) : movements.length === 0 ? (
                          <p className="py-4 text-center text-sm text-slate-400">Sin movimientos para este ATM.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                                  <th className="px-3 py-2">Fecha</th>
                                  <th className="px-3 py-2">Tipo</th>
                                  <th className="px-3 py-2">Monto</th>
                                  <th className="px-3 py-2">Usuario</th>
                                  <th className="px-3 py-2">Referencia</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {movements.map((movement) => (
                                  <tr key={movement.id}>
                                    <td className="px-3 py-2 text-slate-600">{formatDateTime(movement.fecha)}</td>
                                    <td className="px-3 py-2">
                                      <span
                                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                                          movement.tipoMovimiento === "REABASTECIMIENTO"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-amber-100 text-amber-700"
                                        }`}
                                      >
                                        {movement.tipoMovimiento}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-medium text-slate-700">
                                      {formatMoney(movement.monto, movement.moneda)}
                                    </td>
                                    <td className="px-3 py-2 text-slate-600">{movement.usuarioNombre ?? movement.usuarioId}</td>
                                    <td className="px-3 py-2 text-slate-500">{movement.referencia || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={createAtmModalOpen}
        onClose={closeCreateAtmModal}
        title={selectedSucursal ? `Agregar ATM a ${selectedSucursal.nombre}` : "Agregar ATM"}
        size="xl"
      >
        <form onSubmit={handleCreateAtmSubmit} className="space-y-4">
          {selectedSucursal && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryItem label="Sucursal" value={selectedSucursal.nombre} />
                <SummaryItem label="Código" value={selectedSucursal.codigo} />
                <SummaryItem label="Cajas libres" value={String(createAtmCashboxes.length)} />
              </div>
            </div>
          )}

          {createAtmLoading ? (
            <p className="text-sm text-slate-400">Cargando cajas disponibles...</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Código ATM</label>
                  {atmCodigoManual ? (
                    <div className="space-y-1">
                      <input
                        value={createAtmForm.codigo}
                        onChange={(e) => setCreateAtmForm((prev) => ({ ...prev, codigo: e.target.value }))}
                        placeholder="ATM-SCT-02"
                        required
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => { setAtmCodigoManual(false); setCreateAtmForm((prev) => ({ ...prev, codigo: "" })); }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Volver a código automático
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-400">
                        {generateAtmCodePreview(selectedSucursal?.codigo)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setAtmCodigoManual(true)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Editar código manualmente
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Nombre ATM</label>
                  <input
                    value={createAtmForm.nombre}
                    onChange={(e) => setCreateAtmForm((prev) => ({ ...prev, nombre: e.target.value }))}
                    placeholder="ATM Centro Lobby"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Caja asociada</label>
                  <select
                    value={createAtmForm.cajaId}
                    onChange={(e) => setCreateAtmForm((prev) => ({ ...prev, cajaId: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="">Selecciona una caja</option>
                    {createAtmCashboxes.map((cashbox) => (
                      <option key={cashbox.id} value={cashbox.id}>
                        {cashbox.codigo} · {cashbox.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Balance inicial</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={createAtmForm.balanceInicial}
                    onChange={(e) => setCreateAtmForm((prev) => ({ ...prev, balanceInicial: e.target.value }))}
                    placeholder="50000"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Moneda</label>
                  <select
                    value={createAtmForm.moneda}
                    onChange={(e) => setCreateAtmForm((prev) => ({ ...prev, moneda: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="DOP">DOP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
                <select
                  value={createAtmForm.estado}
                  onChange={(e) =>
                    setCreateAtmForm((prev) => ({
                      ...prev,
                      estado: e.target.value as CreateAtmFormState["estado"],
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                  <option value="EN_MANTENIMIENTO">EN_MANTENIMIENTO</option>
                </select>
              </div>

              {createAtmCashboxes.length === 0 && (
                <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Esta sucursal no tiene cajas libres para vincular un nuevo ATM. Primero asigna una caja sin ATM desde la edición de la sucursal.
                </p>
              )}
            </>
          )}

          {createAtmError && <p className="text-sm text-red-500">{createAtmError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeCreateAtmModal}
              className="cursor-pointer rounded-lg px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createAtmSubmitting || createAtmLoading || createAtmCashboxes.length === 0}
              className="cursor-pointer rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createAtmSubmitting ? "Creando..." : "Crear ATM"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={operationModal.open}
        onClose={closeOperationModal}
        title={
          operationModal.type === "deposit"
            ? `Reabastecer ${operationModal.atm?.codigo ?? "ATM"}`
            : `Retirar de ${operationModal.atm?.codigo ?? "ATM"}`
        }
        size="xl"
      >
        <form onSubmit={handleOperationSubmit} className="space-y-4">
          {operationModal.atm && (
            <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
              <SummaryItem label="ATM" value={`${operationModal.atm.nombre} (${operationModal.atm.codigo})`} />
              <SummaryItem label="Sucursal" value={operationModal.atm.sucursalNombre ?? operationModal.atm.sucursalId} />
              <SummaryItem label="Caja asociada" value={operationModal.atm.cajaNombre ?? operationModal.atm.cajaId} />
              <SummaryItem label="Balance actual" value={formatMoney(operationModal.atm.balanceActual, operationModal.atm.moneda)} />
            </div>
          )}

          {operationLoading ? (
            <p className="text-sm text-slate-400">Cargando sesiones abiertas...</p>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Sesión de caja</label>
                <select
                  value={operationForm.sesionCajaId}
                  onChange={(e) => setOperationForm((prev) => ({ ...prev, sesionCajaId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  required
                >
                  <option value="">Selecciona una sesión</option>
                  {operationSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.id} · Caja {session.cajaId}
                    </option>
                  ))}
                </select>
                {operationSessions.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">No hay sesiones abiertas para la caja asociada al ATM.</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Monto</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={operationForm.monto}
                    onChange={(e) => setOperationForm((prev) => ({ ...prev, monto: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Referencia</label>
                  <input
                    value={operationForm.referencia}
                    onChange={(e) => setOperationForm((prev) => ({ ...prev, referencia: e.target.value }))}
                    placeholder="ATM-OP-001"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Observación</label>
                <textarea
                  value={operationForm.observacion}
                  onChange={(e) => setOperationForm((prev) => ({ ...prev, observacion: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </>
          )}

          {operationError && <p className="text-sm text-red-500">{operationError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeOperationModal}
              className="cursor-pointer rounded-lg px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={operationSubmitting || operationLoading || operationSessions.length === 0}
              className="cursor-pointer rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {operationSubmitting
                ? "Procesando..."
                : operationModal.type === "deposit"
                  ? "Reabastecer ATM"
                  : "Retirar del ATM"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{helper}</p>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="truncate text-sm font-semibold text-slate-800">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

function formatMoney(value: number, currency = "DOP") {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
  });
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
    const response = error.response as {
      data?: { error?: { message?: string }; message?: string };
    };

    return response.data?.error?.message || response.data?.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
