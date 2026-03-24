import { useEffect, useState, useCallback } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Activity,
  Banknote, Archive, ArchiveX, MapPin, Calendar, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { kpisApi, sucursalesApi } from "../services/api";
import type { DashboardData, Sucursal, TrendPoint, AverageBalanceData, GeoDistribution } from "../types";
import BranchMap from "../components/ui/BranchMap";

// Default date range: last 30 days
const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const DEFAULT_FROM = thirtyDaysAgo.toISOString().slice(0, 10);
const DEFAULT_TO = today.toISOString().slice(0, 10);

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalId, setSucursalId] = useState("");
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("24h");
  const [loading, setLoading] = useState(true);

  // New data sources
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [avgBalance, setAvgBalance] = useState<AverageBalanceData | null>(null);
  const [geoDist, setGeoDist] = useState<GeoDistribution[]>([]);

  // Date filters
  const [dateFrom, setDateFrom] = useState(DEFAULT_FROM);
  const [dateTo, setDateTo] = useState(DEFAULT_TO);

  useEffect(() => {
    sucursalesApi.list().then(setSucursales).catch(() => {});
    kpisApi.geographicDistribution().then(setGeoDist).catch(() => {});
  }, []);

  // Load dashboard KPIs
  useEffect(() => {
    setLoading(true);
    kpisApi
      .dashboard(sucursalId || undefined)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sucursalId]);

  // Load trend + average balance when dates or sucursal change
  const loadTrendData = useCallback(() => {
    if (!dateFrom || !dateTo) return;
    kpisApi
      .trend({ from: dateFrom, to: dateTo, groupBy: "day", sucursalId: sucursalId || undefined })
      .then((d) => setTrendData(Array.isArray(d) ? d : []))
      .catch(() => setTrendData([]));
    kpisApi
      .averageBalance({ sucursalId: sucursalId || undefined, from: dateFrom, to: dateTo })
      .then(setAvgBalance)
      .catch(() => {});
  }, [dateFrom, dateTo, sucursalId]);

  useEffect(loadTrendData, [loadTrendData]);

  // ── Derived data ──────────────────────────────────────

  const volume =
    data &&
    (period === "24h"
      ? data.transactionVolume24h
      : period === "7d"
        ? data.transactionVolume7d
        : data.transactionVolume30d);

  const ingresos = volume?.find((v) => v.tipo === "INGRESO");
  const egresos = volume?.find((v) => v.tipo === "EGRESO");

  const barChartData = [
    { name: "Ingresos", monto: ingresos?.total ?? 0 },
    { name: "Egresos", monto: egresos?.total ?? 0 },
  ];

  // Format trend data for chart
  const trendChartData = trendData.map((t) => ({
    fecha: new Date(t.fecha).toLocaleDateString("es-DO", { month: "short", day: "numeric" }),
    ingresos: t.ingresos,
    egresos: t.egresos,
    balance: t.balance,
  }));

  // Geographic distribution colors
  const GEO_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
  const totalGeo = geoDist.reduce((sum, g) => sum + g.efectivoTotal, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm">Resumen del flujo de efectivo en tiempo real</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm border-none outline-none bg-transparent" />
            <span className="text-slate-300">—</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-sm border-none outline-none bg-transparent" />
          </div>
          <select
            value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Todas las sucursales</option>
            {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Efectivo en circulación" value={formatCurrency(data?.cashSummary.efectivoTotalEnCirculacion ?? 0)} color="bg-emerald-50 text-emerald-600" />
        <KpiCard icon={<Archive className="w-5 h-5" />} label="Cajas abiertas" value={String(data?.cashSummary.cajasAbiertas ?? 0)} color="bg-blue-50 text-blue-600" />
        <KpiCard icon={<ArchiveX className="w-5 h-5" />} label="Cajas cerradas" value={String(data?.cashSummary.cajasCerradas ?? 0)} color="bg-slate-50 text-slate-600" />
        <KpiCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Alertas de balance"
          value={String(data?.balanceAlerts.length ?? 0)}
          color={(data?.balanceAlerts.length ?? 0) > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}
        />
        <KpiCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Saldo promedio diario"
          value={formatCurrency(avgBalance?.promedioGeneral ?? 0)}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Transaction Volume + Bar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h2 className="text-lg font-semibold text-slate-800">Volumen de transacciones</h2>
          <div className="flex bg-slate-100 rounded-lg p-1">
            {(["24h", "7d", "30d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  period === p ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {p === "24h" ? "24 horas" : p === "7d" ? "7 días" : "30 días"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-emerald-600 font-medium">Ingresos</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(ingresos?.total ?? 0)}</p>
                <p className="text-xs text-emerald-500">{ingresos?.cantidad ?? 0} transacciones</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-600 font-medium">Egresos</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(egresos?.total ?? 0)}</p>
                <p className="text-xs text-red-500">{egresos?.cantidad ?? 0} transacciones</p>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="monto" name="Monto" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tendencias Históricas — Line Chart (from real /kpis/trend endpoint) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-slate-800">Tendencias históricas de flujo de efectivo</h2>
        </div>
        {trendChartData.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">Sin datos para el rango de fechas seleccionado</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="egresos" name="Egresos" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="balance" name="Balance neto" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Saldo Promedio por Caja */}
      {avgBalance && avgBalance.porCaja.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-slate-800">Saldo promedio diario por caja</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={avgBalance.porCaja.map((c) => ({ nombre: c.cajaNombre, promedio: c.promedio }))}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={70} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="promedio" name="Promedio" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Distribución Geográfica por Sucursal */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-slate-800">Distribución geográfica de efectivo</h2>
        </div>
        {geoDist.length === 0 ? (
          <p className="text-slate-400 text-sm py-4 text-center">Sin datos de sucursales</p>
        ) : (
          <div className="space-y-6">
            {/* Interactive Map */}
            <BranchMap branches={geoDist} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie chart */}
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={geoDist.map((g, i) => ({ ...g, color: GEO_COLORS[i % GEO_COLORS.length] }))}
                    dataKey="efectivoTotal"
                    nameKey="nombre"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={2}
                    label={({ nombre, percent }) => `${nombre} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {geoDist.map((_, i) => (
                      <Cell key={i} fill={GEO_COLORS[i % GEO_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Branch details with coordinates */}
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {geoDist.map((branch, i) => {
                const pct = totalGeo > 0 ? (branch.efectivoTotal / totalGeo) * 100 : 0;
                const color = GEO_COLORS[i % GEO_COLORS.length];
                return (
                  <div key={branch.sucursalId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium text-slate-700">{branch.nombre}</span>
                        <span className="text-xs text-slate-400 font-mono">{branch.codigo}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{formatCurrency(branch.efectivoTotal)}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-xs text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Archive className="w-3 h-3" /> {branch.cajasAbiertas} abiertas
                      </span>
                      <span className="flex items-center gap-1">
                        <ArchiveX className="w-3 h-3" /> {branch.cajasCerradas} cerradas
                      </span>
                      {branch.latitud != null && branch.longitud != null && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {branch.latitud.toFixed(4)}, {branch.longitud.toFixed(4)}
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

      {/* Bottom row: Alerts + Recent Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-800">Alertas de balance</h2>
          </div>
          {data?.balanceAlerts.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">Sin alertas pendientes</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {data?.balanceAlerts.map((alert) => (
                <div key={alert.arqueoId} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Caja {alert.cajaId.slice(0, 8)}...</p>
                    <p className="text-xs text-slate-500">{new Date(alert.fecha).toLocaleDateString("es-DO")}</p>
                  </div>
                  <span className={`text-sm font-bold ${alert.diferencia > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {alert.diferencia > 0 ? "+" : ""}{formatCurrency(alert.diferencia)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">Operaciones recientes</h2>
          </div>
          {data?.recentOperations.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">Sin operaciones recientes</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {data?.recentOperations.map((op, i) => (
                <div key={i} className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Banknote className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{op.accion}</p>
                    <p className="text-xs text-slate-500 truncate">{op.resumen}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">
                      {new Date(op.fecha).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-xs text-slate-400">{op.usuario ?? "Sistema"}</p>
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
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(value);
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className="text-xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}
