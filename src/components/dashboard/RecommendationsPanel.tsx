import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { recommendationsApi } from "../../services/api";
import type { Recommendation, RecommendationStatus, Sucursal } from "../../types";
import RecommendationCard from "./RecommendationCard";

type RecommendationsPanelProps = {
  sucursalId?: string;
  branches: Sucursal[];
};

type StatusFilter = "ALL" | RecommendationStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "LEIDA", label: "Leídas" },
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
      if (statusFilter !== "PENDIENTE") {
        setStatusFilter("PENDIENTE");
      }
      const response = await recommendationsApi.list({
        sucursalId,
        estado: "PENDIENTE",
        limit: 6,
      });
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
      setError(readError(err, "No fue posible actualizar la recomendación."));
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            <Sparkles className="h-4 w-4" />
            Recomendaciones operativas
          </div>
          <h2 className="text-lg font-semibold text-slate-800">
            Sugerencias generadas por IA para la operación actual
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Se apoyan en el contexto del sistema y el filtro de sucursal seleccionado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadRecommendations()}
            disabled={loading || generating}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading || generating}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generar nuevas
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              statusFilter === filter.value
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No hay recomendaciones para este filtro.</p>
          <p className="mt-1 text-sm text-slate-500">
            Usa “Generar nuevas” para crear una tanda basada en el estado actual del sistema.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
    </section>
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

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}