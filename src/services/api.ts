import axios from "axios";
import type {
  AuditEvent,
  AverageBalanceData,
  CashMovement,
  Cashbox,
  CashboxAudit,
  CashboxSession,
  ChatResponse,
  DashboardData,
  FundRequest,
  GeoDistribution,
  Recommendation,
  RecommendationStatus,
  Role,
  Sucursal,
  TrendPoint,
  User,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

type NestedApiData<T> = { data: T };

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const { data } = await axios.post<NestedApiData<{ accessToken: string; refreshToken: string }>>(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken }
          );
          localStorage.setItem("accessToken", data.data.accessToken);
          localStorage.setItem("refreshToken", data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      } else {
        localStorage.clear();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

function unwrap<T>(promise: Promise<{ data: NestedApiData<T> }>): Promise<T> {
  return promise.then((r) => r.data.data);
}

function unwrapList<T>(promise: Promise<{ data: unknown }>): Promise<T[]> {
  return promise.then((r) => {
    let result: unknown = r.data;

    for (let i = 0; i < 3; i += 1) {
      if (Array.isArray(result)) return result as T[];
      if (result && typeof result === "object") {
        const obj = result as Record<string, unknown>;
        if (Array.isArray(obj.items)) return obj.items as T[];
        if (Array.isArray(obj.data)) return obj.data as T[];
        if ("data" in obj) {
          result = obj.data;
        } else if ("items" in obj) {
          result = obj.items;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (Array.isArray(result)) return result as T[];
    return [];
  });
}

export const authApi = {
  login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    return api
      .post<NestedApiData<{ accessToken: string; refreshToken: string; expiresIn: number }>>("/auth/login", {
        email,
        password,
      })
      .then((r) => r.data.data);
  },
  logout() {
    const refreshToken = localStorage.getItem("refreshToken");
    return api.post("/auth/logout", { refreshToken });
  },
};

export const kpisApi = {
  dashboard(sucursalId?: string): Promise<DashboardData> {
    return unwrap<DashboardData>(api.get("/kpis/dashboard", { params: sucursalId ? { sucursalId } : {} }));
  },
  trend(params: { from: string; to: string; groupBy?: string; sucursalId?: string }): Promise<TrendPoint[]> {
    return unwrapList<TrendPoint>(api.get("/kpis/trend", { params }));
  },
  averageBalance(params?: { sucursalId?: string; from?: string; to?: string }): Promise<AverageBalanceData> {
    return unwrap<AverageBalanceData>(api.get("/kpis/average-balance", { params }));
  },
  geographicDistribution(): Promise<GeoDistribution[]> {
    return unwrapList<GeoDistribution>(api.get("/kpis/geographic-distribution"));
  },
};

export const sucursalesApi = {
  list: (): Promise<Sucursal[]> => unwrapList<Sucursal>(api.get("/sucursales")),
  getById: (id: string): Promise<Sucursal> => unwrap<Sucursal>(api.get(`/sucursales/${id}`)),
  create: (body: {
    codigo: string;
    nombre: string;
    estado?: string;
    latitud?: number | null;
    longitud?: number | null;
  }) => unwrap<Sucursal>(api.post("/sucursales", body)),
  update: (id: string, body: Record<string, unknown>): Promise<Sucursal> =>
    unwrap<Sucursal>(api.patch(`/sucursales/${id}`, body)),
  delete: (id: string) => api.delete(`/sucursales/${id}`),
};

export const cajasApi = {
  list: (): Promise<Cashbox[]> => unwrapList<Cashbox>(api.get("/cashboxes")),
  getById: (id: string): Promise<Cashbox> => unwrap<Cashbox>(api.get(`/cashboxes/${id}`)),
  create: (body: Record<string, unknown>): Promise<Cashbox> => unwrap<Cashbox>(api.post("/cashboxes", body)),
  update: (id: string, body: Record<string, unknown>): Promise<Cashbox> =>
    unwrap<Cashbox>(api.patch(`/cashboxes/${id}`, body)),
  delete: (id: string) => api.delete(`/cashboxes/${id}`),
};

export const sesionesApi = {
  list: (params?: Record<string, string>): Promise<CashboxSession[]> =>
    unwrapList<CashboxSession>(api.get("/cashbox-sessions", { params })),
  getById: (id: string): Promise<CashboxSession> => unwrap<CashboxSession>(api.get(`/cashbox-sessions/${id}`)),
  open: (body: { cajaId: string; saldoInicial: number }): Promise<CashboxSession> =>
    unwrap<CashboxSession>(api.post("/cashbox-sessions/open", body)),
  close: (id: string, body: { saldoFinalReal: number }) =>
  unwrap(api.patch(`/cashbox-sessions/${id}/close`, body)),
};

export const movimientosApi = {
  list: (params?: Record<string, string>): Promise<CashMovement[]> =>
    unwrapList<CashMovement>(api.get("/movimientos", { params })),
  getById: (id: string): Promise<CashMovement> => unwrap<CashMovement>(api.get(`/movimientos/${id}`)),
  create: (body: Record<string, unknown>): Promise<CashMovement> =>
    unwrap<CashMovement>(api.post("/movimientos", body)),
  void: (id: string): Promise<CashMovement> => unwrap<CashMovement>(api.patch(`/movimientos/${id}/void`)),
};

export const arqueosApi = {
  list: (params?: Record<string, string>): Promise<CashboxAudit[]> =>
    unwrapList<CashboxAudit>(api.get("/arqueos", { params })),
  getById: (id: string): Promise<CashboxAudit> => unwrap<CashboxAudit>(api.get(`/arqueos/${id}`)),
  create: (body: Record<string, unknown>): Promise<CashboxAudit> =>
    unwrap<CashboxAudit>(api.post("/arqueos", body)),
};

export const solicitudesApi = {
  list: (params?: Record<string, string>): Promise<FundRequest[]> =>
    unwrapList<FundRequest>(api.get("/solicitudes", { params })),
  getById: (id: string): Promise<FundRequest> => unwrap<FundRequest>(api.get(`/solicitudes/${id}`)),
  create: (body: Record<string, unknown>): Promise<FundRequest> =>
    unwrap<FundRequest>(api.post("/solicitudes", body)),
  resolve: (
  id: string,
  body: { decision: string; comentario?: string; motivoRechazo?: string; motivo?: string }
  ) => unwrap(api.patch(`/solicitudes/${id}/resolve`, body)),
  execute: (id: string): Promise<FundRequest> => unwrap<FundRequest>(api.patch(`/solicitudes/${id}/execute`)),
};

export const usuariosApi = {
  list: (params?: Record<string, string>): Promise<User[]> => unwrapList<User>(api.get("/users", { params })),
  getById: (id: string): Promise<User> => unwrap<User>(api.get(`/users/${id}`)),
  create: (body: Record<string, unknown>): Promise<User> => unwrap<User>(api.post("/users", body)),
  update: (id: string, body: Record<string, unknown>): Promise<User> =>
    unwrap<User>(api.patch(`/users/${id}`, body)),
  deactivate: (id: string): Promise<User> => unwrap<User>(api.patch(`/users/${id}/deactivate`)),
};

export const rolesApi = {
  list: (): Promise<Role[]> => unwrapList<Role>(api.get("/roles")),
};

export const auditoriaApi = {
  list: (params?: Record<string, string>): Promise<AuditEvent[]> =>
    unwrapList<AuditEvent>(api.get("/auditoria", { params })),
  getById: (id: string): Promise<AuditEvent> => unwrap<AuditEvent>(api.get(`/auditoria/${id}`)),
};

export const recommendationsApi = {
  list: (params?: {
    tipo?: Recommendation["tipo"];
    estado?: RecommendationStatus;
    prioridad?: Recommendation["prioridad"];
    sucursalId?: string;
    limit?: number;
  }): Promise<Recommendation[]> => unwrapList<Recommendation>(api.get("/recomendaciones", { params })),

  generate: (sucursalId?: string): Promise<Recommendation[]> =>
    unwrapList<Recommendation>(
      api.post("/recomendaciones/generate", {}, { params: sucursalId ? { sucursalId } : {} })
    ),

  updateStatus: (id: string, estado: RecommendationStatus): Promise<Recommendation> =>
    unwrap<Recommendation>(api.patch(`/recomendaciones/${id}`, { estado })),

  chat: (body: { message: string; sucursalId?: string }): Promise<ChatResponse> =>
    unwrap<ChatResponse>(api.post("/recomendaciones/chat", body)),
};

export default api;