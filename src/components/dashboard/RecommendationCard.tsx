import type { ReactNode } from "react";
import {
  AlertTriangle,
  Brain,
  Eye,
  EyeOff,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { Recommendation, RecommendationStatus, Sucursal } from "../../types";
import StatusBadge from "../ui/StatusBadge";

type RecommendationCardProps = {
  item: Recommendation;
  branchesById: Record<string, Sucursal>;
  busy?: boolean;
  onChangeStatus: (id: string, status: RecommendationStatus) => void;
};

const priorityAccent: Record<Recommendation["prioridad"], string> = {
  ALTA: "border-l-red-500 bg-red-50/50",
  MEDIA: "border-l-amber-500 bg-amber-50/40",
  BAJA: "border-l-slate-300 bg-slate-50/80",
};

const typeIcon: Record<Recommendation["tipo"], ReactNode> = {
  ALERTA: <AlertTriangle className="h-4 w-4" />,
  OPTIMIZACION: <Sparkles className="h-4 w-4" />,
  PREVISION: <TrendingUp className="h-4 w-4" />,
  GENERAL: <Brain className="h-4 w-4" />,
};

export default function RecommendationCard({
  item,
  branchesById,
  busy = false,
  onChangeStatus,
}: RecommendationCardProps) {
  const branch = item.sucursalId ? branchesById[item.sucursalId] : null;
  const createdAt = new Date(item.createdAt);

  return (
    <article
      className={`rounded-2xl border border-slate-200 border-l-4 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${priorityAccent[item.prioridad]}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
              {typeIcon[item.tipo]}
            </span>
            <StatusBadge value={item.tipo} />
            <StatusBadge value={item.prioridad} />
            <StatusBadge value={item.estado} />
          </div>
          <h3 className="text-base font-semibold text-slate-800">{item.titulo}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{formatDate(createdAt)}</span>
            <span>{formatTime(createdAt)}</span>
            <span>
              {branch
                ? branch.nombre
                : item.sucursalId
                  ? `Sucursal ${item.sucursalId.slice(0, 8)}`
                  : "Todas las sucursales"}
            </span>
          </div>
        </div>
      </div>

      <p className="mb-4 line-clamp-5 text-sm leading-6 text-slate-600">{item.descripcion}</p>

      <div className="flex flex-wrap items-center gap-2">
        {item.estado !== "LEIDA" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onChangeStatus(item.id, "LEIDA")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Eye className="h-4 w-4" />
            Marcar leída
          </button>
        )}
        {item.estado !== "DESCARTADA" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onChangeStatus(item.id, "DESCARTADA")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <EyeOff className="h-4 w-4" />
            Descartar
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
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("es-DO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}