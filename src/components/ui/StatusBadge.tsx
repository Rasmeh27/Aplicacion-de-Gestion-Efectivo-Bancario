const colors: Record<string, string> = {
  ACTIVA: "bg-emerald-50 text-emerald-700",
  ACTIVO: "bg-emerald-50 text-emerald-700",
  ABIERTA: "bg-blue-50 text-blue-700",
  CERRADA: "bg-slate-100 text-slate-600",
  INACTIVA: "bg-slate-100 text-slate-600",
  BLOQUEADO: "bg-red-50 text-red-700",
  EN_MANTENIMIENTO: "bg-amber-50 text-amber-700",
  PENDIENTE: "bg-amber-50 text-amber-700",
  APROBADA: "bg-emerald-50 text-emerald-700",
  RECHAZADA: "bg-red-50 text-red-700",
  EJECUTADA: "bg-blue-50 text-blue-700",
  INGRESO: "bg-emerald-50 text-emerald-700",
  EGRESO: "bg-red-50 text-red-700",
  TRANSFERENCIA: "bg-purple-50 text-purple-700",
  REABASTECIMIENTO: "bg-cyan-50 text-cyan-700",
  BAJA: "bg-slate-100 text-slate-600",
  MEDIA: "bg-blue-50 text-blue-700",
  ALTA: "bg-amber-50 text-amber-700",
  URGENTE: "bg-red-50 text-red-700",
};

export default function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[value] ?? "bg-slate-100 text-slate-600"}`}
    >
      {value}
    </span>
  );
}
