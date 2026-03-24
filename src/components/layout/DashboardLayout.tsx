import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-white transition-all duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "w-20" : "w-64"}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-700/50">
          {!collapsed && (
            <span className="text-lg font-bold tracking-wide">BankingApp</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-700/60 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                } ${collapsed ? "justify-center" : ""}`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors w-full cursor-pointer ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1" />
          <p className="text-sm text-slate-500">
            © 2026-1 | IDS348 DESARROLLO WEB
          </p>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
