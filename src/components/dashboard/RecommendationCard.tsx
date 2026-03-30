import type { ReactNode } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Lightbulb,
  MapPin,
  RotateCcw,
  TrendingUp,
  XCircle,
} from "lucide-react";
import type { Recommendation, RecommendationStatus, Sucursal } from "../../types";

type Props = {
  item: Recommendation;
  branchesById: Record<string, Sucursal>;
  busy?: boolean;
  onChangeStatus: (id: string, status: RecommendationStatus) => void;
};

/* ── config ───────────────────────────────────────────────── */

const typeConfig: Record<Recommendation["tipo"], { icon: ReactNode; label: string; bg: string; text: string }> = {
  ALERTA: { icon: <AlertTriangle className="h-4 w-4" />, label: "Alerta", bg: "bg-red-50", text: "text-red-600" },
  OPTIMIZACION: { icon: <Lightbulb className="h-4 w-4" />, label: "Optimizacion", bg: "bg-blue-50", text: "text-blue-600" },
  PREVISION: { icon: <TrendingUp className="h-4 w-4" />, label: "Prevision", bg: "bg-indigo-50", text: "text-indigo-600" },
  GENERAL: { icon: <Brain className="h-4 w-4" />, label: "General", bg: "bg-slate-50", text: "text-slate-600" },
};

const priorityConfig: Record<Recommendation["prioridad"], { label: string; dot: string; ring: string }> = {
  ALTA: { label: "Alta", dot: "bg-red-500", ring: "ring-red-500/20" },
  MEDIA: { label: "Media", dot: "bg-amber-500", ring: "ring-amber-500/20" },
  BAJA: { label: "Baja", dot: "bg-slate-400", ring: "ring-slate-400/20" },
};

const statusConfig: Record<RecommendationStatus, { icon: ReactNode; label: string; bg: string; text: string }> = {
  PENDIENTE: { icon: <Clock className="h-3.5 w-3.5" />, label: "Pendiente", bg: "bg-amber-50", text: "text-amber-700" },
  LEIDA: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Leida", bg: "bg-emerald-50", text: "text-emerald-700" },
  DESCARTADA: { icon: <XCircle className="h-3.5 w-3.5" />, label: "Descartada", bg: "bg-slate-50", text: "text-slate-500" },
};

const accentTop: Record<Recommendation["prioridad"], string> = {
  ALTA: "from-red-500 to-rose-500",
  MEDIA: "from-amber-400 to-orange-400",
  BAJA: "from-slate-300 to-slate-400",
};

/* ── component ────────────────────────────────────────────── */

export default function RecommendationCard({ item, branchesById, busy = false, onChangeStatus }: Props) {
  const branch = item.sucursalId ? branchesById[item.sucursalId] : null;
  const createdAt = new Date(item.createdAt);
  const type = typeConfig[item.tipo];
  const priority = priorityConfig[item.prioridad];
  const status = statusConfig[item.estado];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      {/* Top accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${accentTop[item.prioridad]}`} />

      <div className="flex-1 p-5">
        {/* Top row: type + priority + status */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${type.bg} ${type.text}`}>
            {type.icon}
            {type.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200`}>
            <span className={`h-2 w-2 rounded-full ${priority.dot} ring-2 ${priority.ring}`} />
            {priority.label}
          </span>
          <span className={`ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
            {status.icon}
            {status.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-2 text-sm font-bold text-slate-800 leading-snug line-clamp-2">
          {item.titulo}
        </h3>

        {/* Description */}
        <p className="mb-3 line-clamp-3 text-[13px] leading-relaxed text-slate-500">
          {item.descripcion}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(createdAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {branch ? branch.nombre : item.sucursalId ? `Suc. ${item.sucursalId.slice(0, 6)}` : "Global"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
        {item.estado !== "LEIDA" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onChangeStatus(item.id, "LEIDA")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            <Eye className="h-3.5 w-3.5" />
            Leida
          </button>
        )}
        {item.estado !== "DESCARTADA" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onChangeStatus(item.id, "DESCARTADA")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Descartar
          </button>
        )}
        {item.estado === "DESCARTADA" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onChangeStatus(item.id, "PENDIENTE")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar
          </button>
        )}
      </div>
    </article>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
