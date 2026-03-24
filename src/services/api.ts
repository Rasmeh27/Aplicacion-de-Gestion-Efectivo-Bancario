import axios from "axios";
import type { GeoDistribution } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → try refresh, else redirect to login
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
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

// Helper: unwrap { data: ... } wrapper from backend
function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  return promise.then((r) => r.data.data);
}

// Helper: for list endpoints — handles all backend response shapes:
// { data: [...] }                              → plain array
// { data: { data: [...] } }                    → wrapped array
// { data: { data: { items: [...], total } } }  → paginated with "items"
// { data: { data: { data: [...], total } } }   → paginated with "data"
function unwrapList<T>(promise: Promise<{ data: unknown }>): Promise<T[]> {
  return promise.then((r) => {
    let result: unknown = r.data;

    // Unwrap up to 3 levels, looking for an array in "data" or "items"
    for (let i = 0; i < 3; i++) {
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

// ── Auth ─────────────────────────────────────────────────

export const authApi = {
  login(email: string, password: string) {
    return api.post("/auth/login", { email, password }).then((r) => r.data.data);
  },
  logout() {
    const refreshToken = localStorage.getItem("refreshToken");
    return api.post("/auth/logout", { refreshToken });
  },
};

// ── KPIs / Dashboard ────────────────────────────────────

export const kpisApi = {
  dashboard(sucursalId?: string) {
    return unwrap(api.get("/kpis/dashboard", { params: sucursalId ? { sucursalId } : {} }));
  },
  trend(params: { from: string; to: string; groupBy?: string; sucursalId?: string }) {
    return unwrapList(api.get("/kpis/trend", { params }));
  },
  averageBalance(params?: { sucursalId?: string; from?: string; to?: string }) {
    return unwrap(api.get("/kpis/average-balance", { params }));
  },
  geographicDistribution() {
    return unwrapList<GeoDistribution>(api.get("/kpis/geographic-distribution"));
  },
};

// ── Sucursales ──────────────────────────────────────────

export const sucursalesApi = {
  list: () => unwrapList(api.get("/sucursales")),
  getById: (id: string) => unwrap(api.get(`/sucursales/${id}`)),
  create: (body: { codigo: string; nombre: string; estado?: string }) =>
    unwrap(api.post("/sucursales", body)),
  update: (id: string, body: Record<string, unknown>) =>
    unwrap(api.patch(`/sucursales/${id}`, body)),
  delete: (id: string) => api.delete(`/sucursales/${id}`),
};

// ── Cajas ───────────────────────────────────────────────

export const cajasApi = {
  list: () => unwrapList(api.get("/cashboxes")),
  getById: (id: string) => unwrap(api.get(`/cashboxes/${id}`)),
  create: (body: Record<string, unknown>) => unwrap(api.post("/cashboxes", body)),
  update: (id: string, body: Record<string, unknown>) => unwrap(api.patch(`/cashboxes/${id}`, body)),
  delete: (id: string) => api.delete(`/cashboxes/${id}`),
};

// ── Sesiones de Caja ────────────────────────────────────

export const sesionesApi = {
  list: (params?: Record<string, string>) => unwrapList(api.get("/cashbox-sessions", { params })),
  getById: (id: string) => unwrap(api.get(`/cashbox-sessions/${id}`)),
  open: (body: { cajaId: string; saldoInicial: number }) =>
    unwrap(api.post("/cashbox-sessions/open", body)),
  close: (id: string, body: { saldoRealCierre: number }) =>
    unwrap(api.patch(`/cashbox-sessions/${id}/close`, body)),
};

// ── Movimientos ─────────────────────────────────────────

export const movimientosApi = {
  list: (params?: Record<string, string>) => unwrapList(api.get("/movimientos", { params })),
  getById: (id: string) => unwrap(api.get(`/movimientos/${id}`)),
  create: (body: Record<string, unknown>) => unwrap(api.post("/movimientos", body)),
  void: (id: string) => unwrap(api.patch(`/movimientos/${id}/void`)),
};

// ── Arqueos ─────────────────────────────────────────────

export const arqueosApi = {
  list: (params?: Record<string, string>) => unwrapList(api.get("/arqueos", { params })),
  getById: (id: string) => unwrap(api.get(`/arqueos/${id}`)),
  create: (body: Record<string, unknown>) => unwrap(api.post("/arqueos", body)),
};

// ── Solicitudes de fondos ───────────────────────────────

export const solicitudesApi = {
  list: (params?: Record<string, string>) => unwrapList(api.get("/solicitudes", { params })),
  getById: (id: string) => unwrap(api.get(`/solicitudes/${id}`)),
  create: (body: Record<string, unknown>) => unwrap(api.post("/solicitudes", body)),
  resolve: (id: string, body: { decision: string; motivo?: string }) =>
    unwrap(api.patch(`/solicitudes/${id}/resolve`, body)),
  execute: (id: string) => unwrap(api.patch(`/solicitudes/${id}/execute`)),
};

// ── Usuarios ────────────────────────────────────────────

export const usuariosApi = {
  list: (params?: Record<string, string>) => unwrapList(api.get("/users", { params })),
  getById: (id: string) => unwrap(api.get(`/users/${id}`)),
  create: (body: Record<string, unknown>) => unwrap(api.post("/users", body)),
  update: (id: string, body: Record<string, unknown>) => unwrap(api.patch(`/users/${id}`, body)),
  deactivate: (id: string) => unwrap(api.patch(`/users/${id}/deactivate`)),
};

// ── Roles ───────────────────────────────────────────────

export const rolesApi = {
  list: () => unwrapList(api.get("/roles")),
};

// ── Auditoría ───────────────────────────────────────────

export const auditoriaApi = {
  list: (params?: Record<string, string>) => unwrapList(api.get("/auditoria", { params })),
  getById: (id: string) => unwrap(api.get(`/auditoria/${id}`)),
};

export default api;
