import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArchiveX,
  Banknote,
  BarChart3,
  Calendar,
  DollarSign,
  MapPin,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import RecommendationsPanel from "../components/dashboard/RecommendationsPanel";
import BranchMap from "../components/ui/BranchMap";
import { kpisApi, sucursalesApi } from "../services/api";
import type {
  AverageBalanceData,
  DashboardData,
  GeoDistribution,
  Sucursal,
  TrendPoint,
} from "../types";

const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const DEFAULT_FROM = thirtyDaysAgo.toISOString().slice(0, 10);
const DEFAULT_TO = today.toISOString().slice(0, 10);
const GEO_COLORS = [
  "#10b981",
  "#166088",
  "#f59e0b",
  "#ef4444",
  "#0053AD",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalId, setSucursalId] = useState("");
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("24h");
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [avgBalance, setAvgBalance] = useState<AverageBalanceData | null>(null);
  const [geoDist, setGeoDist] = useState<GeoDistribution[]>([]);
  const [dateFrom, setDateFrom] = useState(DEFAULT_FROM);
  const [dateTo, setDateTo] = useState(DEFAULT_TO);

  useEffect(() => {
    void sucursalesApi.list().then(setSucursales).catch(() => setSucursales([]));
    void kpisApi.geographicDistribution().then(setGeoDist).catch(() => setGeoDist([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    void kpisApi
      .dashboard(sucursalId || undefined)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [sucursalId]);

  const loadTrendData = useCallback(() => {
    if (!dateFrom || !dateTo) return;

    void kpisApi
      .trend({
        from: dateFrom,
        to: dateTo,
        groupBy: "day",
        sucursalId: sucursalId || undefined,
      })
      .then(setTrendData)
      .catch(() => setTrendData([]));

    void kpisApi
      .averageBalance({ sucursalId: sucursalId || undefined, from: dateFrom, to: dateTo })
      .then(setAvgBalance)
      .catch(() => setAvgBalance(null));
  }, [dateFrom, dateTo, sucursalId]);

  useEffect(() => {
    loadTrendData();
  }, [loadTrendData]);

  const volume = useMemo(() => {
    if (!data) return [];
    if (period === "24h") return data.transactionVolume24h;
    if (period === "7d") return data.transactionVolume7d;
    return data.transactionVolume30d;
  }, [data, period]);

  const ingresos = volume.find((item) => item.tipo === "INGRESO");
  const egresos = volume.find((item) => item.tipo === "EGRESO");

  const barChartData = [
    { name: "Ingresos", monto: ingresos?.total ?? 0 },
    { name: "Egresos", monto: egresos?.total ?? 0 },
  ];

  const trendChartData = trendData.map((item) => ({
    fecha: new Date(item.fecha).toLocaleDateString("es-DO", { month: "short", day: "numeric" }),
    ingresos: item.ingresos,
    egresos: item.egresos,
    balance: item.balance,
  }));

  const geoChartData = geoDist.map((item, index) => ({
    ...item,
    color: GEO_COLORS[index % GEO_COLORS.length],
  }));

  const totalGeo = geoDist.reduce((sum, item) => sum + item.efectivoTotal, 0);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Resumen del flujo de efectivo en tiempo real</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="bg-transparent text-sm outline-none"
            />
            <span className="text-slate-300">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={sucursalId}
            onChange={(event) => setSucursalId(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-400"
          >
            <option value="">Todas las sucursales</option>
            {sucursales.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Efectivo en circulación"
          value={formatCurrency(data?.cashSummary.efectivoTotalEnCirculacion ?? 0)}
          color="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          icon={<Archive className="h-5 w-5" />}
          label="Cajas abiertas"
          value={String(data?.cashSummary.cajasAbiertas ?? 0)}
          color="bg-[#166088]/10 text-[#166088]"
        />
        <KpiCard
          icon={<ArchiveX className="h-5 w-5" />}
          label="Cajas cerradas"
          value={String(data?.cashSummary.cajasCerradas ?? 0)}
          color="bg-slate-50 text-slate-600"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Alertas de balance"
          value={String(data?.balanceAlerts.length ?? 0)}
          color={(data?.balanceAlerts.length ?? 0) > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}
        />
        <KpiCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Saldo promedio diario"
          value={formatCurrency(avgBalance?.promedioGeneral ?? 0)}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      <RecommendationsPanel sucursalId={sucursalId || undefined} branches={sucursales} />

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Volumen de transacciones</h2>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {(["24h", "7d", "30d"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  period === option
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {option === "24h" ? "24 horas" : option === "7d" ? "7 días" : "30 días"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <MetricHighlight
              title="Ingresos"
              amount={formatCurrency(ingresos?.total ?? 0)}
              count={`${ingresos?.cantidad ?? 0} transacciones`}
              tone="success"
              icon={<TrendingUp className="h-6 w-6 text-emerald-600" />}
            />
            <MetricHighlight
              title="Egresos"
              amount={formatCurrency(egresos?.total ?? 0)}
              count={`${egresos?.cantidad ?? 0} transacciones`}
              tone="danger"
              icon={<TrendingDown className="h-6 w-6 text-red-600" />}
            />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${(Number(value) / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                <Legend />
                <Bar dataKey="monto" name="Monto" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-slate-800">Tendencias históricas de flujo de efectivo</h2>
        </div>

        {trendChartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Sin datos para el rango de fechas seleccionado.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${(Number(value) / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                <Legend />
                <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="egresos" name="Egresos" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Balance neto"
                  stroke="#166088"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {avgBalance && avgBalance.porCaja.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-slate-800">Saldo promedio diario por caja</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={avgBalance.porCaja.map((item) => ({ nombre: item.cajaNombre, promedio: item.promedio }))}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(value) => `${(Number(value) / 1000).toFixed(0)}k`} />
                <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11 }} width={70} />
                <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                <Bar dataKey="promedio" name="Promedio" fill="#0053AD" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-slate-800">Distribución geográfica de efectivo</h2>
        </div>

        {geoDist.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Sin datos de sucursales.</p>
        ) : (
          <div className="space-y-6">
            <BranchMap branches={geoDist} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={geoChartData}
                      dataKey="efectivoTotal"
                      nameKey="nombre"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                      label={({ name, percent }) => `${String(name)} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {geoChartData.map((item) => (
                        <Cell key={item.sucursalId} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto">
                {geoChartData.map((branch) => {
                  const pct = totalGeo > 0 ? (branch.efectivoTotal / totalGeo) * 100 : 0;

                  return (
                    <div key={branch.sucursalId}>
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: branch.color }} />
                          <span className="text-sm font-medium text-slate-700">{branch.nombre}</span>
                          <span className="font-mono text-xs text-slate-400">{branch.codigo}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800">{formatCurrency(branch.efectivoTotal)}</span>
                      </div>
                      <div className="mb-1 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: branch.color }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs text-slate-400">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Archive className="h-3 w-3" /> {branch.cajasAbiertas} abiertas
                        </span>
                        <span className="flex items-center gap-1">
                          <ArchiveX className="h-3 w-3" /> {branch.cajasCerradas} cerradas
                        </span>
                        {branch.latitud != null && branch.longitud != null && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {branch.latitud.toFixed(4)}, {branch.longitud.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-800">Alertas de balance</h2>
          </div>
          {data?.balanceAlerts.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Sin alertas pendientes.</p>
          ) : (
            <div className="max-h-72 space-y-3 overflow-y-auto">
              {data?.balanceAlerts.map((alert) => (
                <div key={alert.arqueoId} className="flex items-center justify-between rounded-lg bg-amber-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Caja {alert.cajaId.slice(0, 8)}...</p>
                    <p className="text-xs text-slate-500">{new Date(alert.fecha).toLocaleDateString("es-DO")}</p>
                  </div>
                  <span className={`text-sm font-bold ${alert.diferencia > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {alert.diferencia > 0 ? "+" : ""}
                    {formatCurrency(alert.diferencia)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">Operaciones recientes</h2>
          </div>
          {data?.recentOperations.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Sin operaciones recientes.</p>
          ) : (
            <div className="max-h-72 space-y-3 overflow-y-auto">
              {data?.recentOperations.map((operation, index) => (
                <div key={`${operation.fecha}-${index}`} className="flex items-start gap-3 rounded-lg p-3 transition hover:bg-slate-50">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <Banknote className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{operation.accion}</p>
                    <p className="truncate text-xs text-slate-500">{operation.resumen}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-slate-400">
                      {new Date(operation.fecha).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-xs text-slate-400">{operation.usuario ?? "Sistema"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(value);
}

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MetricHighlight({
  title,
  amount,
  count,
  tone,
  icon,
}: {
  title: string;
  amount: string;
  count: string;
  tone: "success" | "danger";
  icon: ReactNode;
}) {
  const styles =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-red-50 text-red-700";
  const iconStyles = tone === "success" ? "bg-emerald-100" : "bg-red-100";
  const captionStyles = tone === "success" ? "text-emerald-500" : "text-red-500";

  return (
    <div className={`flex items-center gap-4 rounded-xl p-4 ${styles}`}>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconStyles}`}>{icon}</div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold">{amount}</p>
        <p className={`text-xs ${captionStyles}`}>{count}</p>
      </div>
    </div>
  );
}