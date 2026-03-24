import { useEffect, useState } from "react";
import { Search, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { auditoriaApi } from "../../services/api";
import type { AuditEvent } from "../../types";

export default function AuditoriaPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    auditoriaApi.list().then((data) => setEvents(Array.isArray(data) ? data : [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const fmtDate = (d: string) => new Date(d).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "medium" });

  const filtered = events.filter((e) =>
    e.accion.toLowerCase().includes(search.toLowerCase()) ||
    e.entidad.toLowerCase().includes(search.toLowerCase()) ||
    e.resumen?.toLowerCase().includes(search.toLowerCase())
  );

  const actionColor = (action: string) => {
    if (action.includes("CREAR") || action.includes("CREATE")) return "bg-emerald-50 text-emerald-700";
    if (action.includes("EDITAR") || action.includes("UPDATE")) return "bg-blue-50 text-blue-700";
    if (action.includes("ELIMINAR") || action.includes("DELETE")) return "bg-red-50 text-red-700";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Auditoría</h1>
          <p className="text-slate-500 text-sm">Registro de todas las acciones realizadas en el sistema</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Shield className="w-4 h-4" />
          {events.length} eventos registrados
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Buscar por acción, entidad..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 px-6 py-8 text-center text-slate-400">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 px-6 py-8 text-center text-slate-400">Sin eventos de auditoría</div>
        ) : filtered.map((e) => (
          <div key={e.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === e.id ? null : e.id)}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer text-left"
            >
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${actionColor(e.accion)}`}>
                {e.accion}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">
                  <span className="font-medium">{e.entidad}</span>
                  <span className="text-slate-400 mx-2">·</span>
                  <span className="text-slate-500">{e.resumen}</span>
                </p>
              </div>
              <span className="text-xs text-slate-400 shrink-0">{fmtDate(e.fecha)}</span>
              {expanded === e.id ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
            </button>
            {expanded === e.id && (
              <div className="px-6 pb-4 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-4 pt-3 text-xs">
                  <div>
                    <p className="text-slate-400 font-medium mb-1">Entidad ID</p>
                    <p className="text-slate-600 font-mono">{e.entidadId}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium mb-1">Usuario</p>
                    <p className="text-slate-600">{e.usuarioId ?? "Sistema"}</p>
                  </div>
                </div>
                {(e.antes || e.despues) && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    {e.antes && (
                      <div>
                        <p className="text-xs text-slate-400 font-medium mb-1">Antes</p>
                        <pre className="text-xs bg-red-50 text-red-700 p-2 rounded overflow-auto max-h-32">{JSON.stringify(e.antes, null, 2)}</pre>
                      </div>
                    )}
                    {e.despues && (
                      <div>
                        <p className="text-xs text-slate-400 font-medium mb-1">Después</p>
                        <pre className="text-xs bg-emerald-50 text-emerald-700 p-2 rounded overflow-auto max-h-32">{JSON.stringify(e.despues, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
