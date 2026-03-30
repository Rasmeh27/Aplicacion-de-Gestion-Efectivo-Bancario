import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Filter } from "lucide-react";
import { recommendationsApi } from "../../services/api";
import type { Recommendation, RecommendationStatus, Sucursal } from "../../types";
import RecommendationCard from "./RecommendationCard";

type RecommendationsPanelProps = {
  sucursalId?: string;
  branches: Sucursal[];
};

type StatusFilter = "ALL" | RecommendationStatus;

const FILTERS: { value: StatusFilter; label: string; count?: number }[] = [
  { value: "ALL", label: "Todas" },
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "LEIDA", label: "Leidas" },
  { value: "DESCARTADA", label: "Descartadas" },
];

export default function RecommendationsPanel({
  sucursalId,
  branches,
}: RecommendationsPanelProps) {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDIENTE");

  const branchesById = useMemo(
    () => Object.fromEntries(branches.map((branch) => [branch.id, branch])),
    [branches]
  );

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await recommendationsApi.list({
        sucursalId,
        limit: 6,
        ...(statusFilter !== "ALL" ? { estado: statusFilter } : {}),
      });
      setItems(response);
    } catch (err: unknown) {
      setError(readError(err, "No fue posible cargar las recomendaciones."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sucursalId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      await recommendationsApi.generate(sucursalId);
      if (statusFilter !== "PENDIENTE") setStatusFilter("PENDIENTE");
      const response = await recommendationsApi.list({ sucursalId, estado: "PENDIENTE", limit: 6 });
      setItems(response);
    } catch (err: unknown) {
      setError(readError(err, "No fue posible generar nuevas recomendaciones."));
    } finally {
      setGenerating(false);
    }
  };

  const handleChangeStatus = async (id: string, status: RecommendationStatus) => {
    setUpdatingId(id);
    setError("");
    try {
      const updated = await recommendationsApi.updateStatus(id, status);
      setItems((current) => {
        const next = current.map((item) => (item.id === id ? updated : item));
        if (statusFilter !== "ALL" && statusFilter !== updated.estado) {
          return next.filter((item) => item.id !== id);
        }
        return next;
      });
    } catch (err: unknown) {
      setError(readError(err, "No fue posible actualizar la recomendacion."));
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Recomendaciones IA</h2>
              <p className="text-sm text-slate-500">
                Sugerencias inteligentes basadas en datos del sistema
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadRecommendations()}
              disabled={loading || generating}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading || generating}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generar nuevas
            </button>
          </div>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-3">
        <Filter className="h-4 w-4 text-slate-400" />
        <div className="flex gap-1.5">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                statusFilter === filter.value
                  ? "bg-slate-800 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-xl bg-slate-50" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Sparkles className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-600">No hay recomendaciones</p>
            <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400">
              Presiona "Generar nuevas" para obtener sugerencias basadas en los datos actuales del sistema.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <RecommendationCard
                key={item.id}
                item={item}
                branchesById={branchesById}
                busy={updatingId === item.id}
                onChangeStatus={handleChangeStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
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
    const data = (error.response as { data?: { error?: { message?: string } } }).data;
    return data?.error?.message ?? fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
