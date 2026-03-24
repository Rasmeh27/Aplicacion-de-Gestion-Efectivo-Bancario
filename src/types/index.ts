// ── Auth ─────────────────────────────────────────────────

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

// ── Sucursales ──────────────────────────────────────────

export type SucursalStatus = "ACTIVA" | "INACTIVA";

export type Sucursal = {
  id: string;
  codigo: string;
  nombre: string;
  estado: SucursalStatus;
  total: number;
  latitud: number | null;
  longitud: number | null;
};

// ── Cajas (Cashboxes) ───────────────────────────────────

export type CashboxStatus = "ACTIVA" | "INACTIVA" | "EN_MANTENIMIENTO";

export type Cashbox = {
  id: string;
  sucursalId: string;
  codigo: string;
  nombre: string;
  estado: CashboxStatus;
  moneda: string;
  limiteOperativo: number;
};

// ── Sesiones de Caja ────────────────────────────────────

export type SessionStatus = "ABIERTA" | "CERRADA";

export type CashboxSession = {
  id: string;
  cajaId: string;
  usuarioId: string;
  fechaApertura: string;
  fechaCierre: string | null;
  saldoInicial: number;
  saldoFinal: number | null;
  saldoRealCierre: number | null;
  estado: SessionStatus;
};

// ── Dashboard / KPIs ────────────────────────────────────

export type CashSummary = {
  efectivoTotalEnCirculacion: number;
  cajasAbiertas: number;
  cajasCerradas: number;
};

export type TransactionVolume = {
  tipo: "INGRESO" | "EGRESO";
  cantidad: number;
  total: number;
};

export type BalanceAlert = {
  arqueoId: string;
  cajaId: string;
  diferencia: number;
  fecha: string;
};

export type RecentOperation = {
  accion: string;
  resumen: string;
  fecha: string;
  usuario: string | null;
};

export type DashboardData = {
  cashSummary: CashSummary;
  transactionVolume24h: TransactionVolume[];
  transactionVolume7d: TransactionVolume[];
  transactionVolume30d: TransactionVolume[];
  balanceAlerts: BalanceAlert[];
  recentOperations: RecentOperation[];
};

// ── KPI Trend (time-series) ──────────────────────────────

export type TrendPoint = {
  fecha: string;
  ingresos: number;
  egresos: number;
  balance: number;
};

// ── KPI Average Balance ─────────────────────────────────

export type AverageBalanceData = {
  promedioGeneral: number;
  porCaja: { cajaId: string; cajaNombre: string; promedio: number }[];
};

// ── KPI Geographic Distribution ─────────────────────────

export type GeoDistribution = {
  sucursalId: string;
  nombre: string;
  codigo: string;
  latitud: number | null;
  longitud: number | null;
  efectivoTotal: number;
  cajasAbiertas: number;
  cajasCerradas: number;
};

// ── Movimientos ─────────────────────────────────────────

export type MovementType =
  | "INGRESO"
  | "EGRESO"
  | "TRANSFERENCIA"
  | "REABASTECIMIENTO";

export type CashMovement = {
  id: string;
  sesionCajaId: string;
  tipo: MovementType;
  monto: number;
  moneda: string;
  descripcion: string;
  cajaOrigenId: string | null;
  cajaDestinoId: string | null;
  fecha: string;
  usuarioId: string;
};

// ── Arqueos (Cashbox Audits) ────────────────────────────

export type CashboxAudit = {
  id: string;
  sesionCajaId: string;
  usuarioId: string;
  fecha: string;
  moneda: string;
  saldoContado: number;
  saldoEsperado: number;
  diferencia: number;
  motivoDiferencia: string | null;
  observaciones: string | null;
};

// ── Solicitudes de Fondos ───────────────────────────────

export type RequestStatus = "PENDIENTE" | "APROBADA" | "RECHAZADA" | "EJECUTADA";
export type Priority = "BAJA" | "MEDIA" | "ALTA" | "URGENTE";

export type FundRequest = {
  id: string;
  status: RequestStatus;
  monto: number;
  moneda: string;
  motivo: string;
  prioridad: Priority;
  origenSucursalId: string | null;
  destinoSucursalId: string | null;
  solicitanteId: string;
  fecha: string;
};

// ── Usuarios ────────────────────────────────────────────

export type UserStatus = "ACTIVO" | "BLOQUEADO";

export type User = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  sucursalDefaultId: string | null;
  roleIds: string[];
};

// ── Roles ───────────────────────────────────────────────

export type Role = {
  id: string;
  nombre: string;
  permisos: string[];
};

// ── Auditoría ───────────────────────────────────────────

export type AuditEvent = {
  id: string;
  fecha: string;
  usuarioId: string | null;
  accion: string;
  entidad: string;
  entidadId: string;
  resumen: string;
  antes: Record<string, unknown> | null;
  despues: Record<string, unknown> | null;
};

// ── Paginación ──────────────────────────────────────────

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  perPage: number;
};
