import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import SucursalesPage from "../pages/sucursales/SucursalesPage";
import CajasPage from "../pages/cajas/CajasPage";
import SesionesPage from "../pages/sesiones/SesionesPage";
import MovimientosPage from "../pages/movimientos/MovimientosPage";
import ArqueosPage from "../pages/arqueos/ArqueosPage";
import SolicitudesPage from "../pages/solicitudes/SolicitudesPage";
import UsuariosPage from "../pages/usuarios/UsuariosPage";
import AuditoriaPage from "../pages/auditoria/AuditoriaPage";
import DashboardLayout from "../components/layout/DashboardLayout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("accessToken");
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sucursales" element={<SucursalesPage />} />
          <Route path="/cajas" element={<CajasPage />} />
          <Route path="/sesiones" element={<SesionesPage />} />
          <Route path="/movimientos" element={<MovimientosPage />} />
          <Route path="/arqueos" element={<ArqueosPage />} />
          <Route path="/solicitudes" element={<SolicitudesPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/auditoria" element={<AuditoriaPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
