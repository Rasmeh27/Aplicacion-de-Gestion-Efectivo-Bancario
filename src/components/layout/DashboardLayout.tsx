import { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  ArrowLeftRight,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Archive,
  DoorOpen,
  ClipboardCheck,
  Users,
  Shield,
} from "lucide-react";
import { authApi } from "../../services/api";
import GlobalAssistantChat from "../chat/GlobalAssistantChat";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sucursales", label: "Sucursales", icon: Building2 },
  { to: "/cajas", label: "Cajas", icon: Archive },
  { to: "/sesiones", label: "Sesiones", icon: DoorOpen },
  { to: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { to: "/arqueos", label: "Arqueos", icon: ClipboardCheck },
  { to: "/solicitudes", label: "Solicitudes", icon: FileText },
  { to: "/usuarios", label: "Usuarios", icon: Users },
  { to: "/auditoria", label: "Auditoría", icon: Shield },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isDashboard = location.pathname === "/dashboard";

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // no-op
    }
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-white transition-all duration-300 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 px-3 py-4" style={{ minHeight: "5rem" }}>
          {!collapsed && (
            <div className="flex items-center gap-1">
              <img src="/shield_logo.png" alt="Valtor" className="-ml-2 h-16 w-16 object-contain" />
              <span className="text-xl font-bold tracking-wide">Valtor</span>
            </div>
          )}
          {collapsed && (
            <img src="/shield_logo.png" alt="Valtor" className="mx-auto h-14 w-14 object-contain" />
          )}
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className="hidden h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-800 lg:flex"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-800 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                } ${collapsed ? "justify-center" : ""}`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-slate-700/50 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/15 hover:text-red-400 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
          <div className="flex-1" />
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {isDashboard && <GlobalAssistantChat />}
    </div>
  );
}