import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoDistribution } from "../../types";

// Fix default marker icons for bundled builds
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function createIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
      background: ${color}; transform: rotate(-45deg);
      border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><div style="
      width: 10px; height: 10px; border-radius: 50%;
      background: white; transform: rotate(45deg);
    "></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(value);
}

// Auto-fit bounds to markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }
  }, [map, positions]);
  return null;
}

export default function BranchMap({ branches }: { branches: GeoDistribution[] }) {
  const withCoords = branches.filter((b) => b.latitud != null && b.longitud != null);

  if (withCoords.length === 0) {
    return (
      <div className="h-80 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 text-sm">
        Sin coordenadas geográficas disponibles
      </div>
    );
  }

  // Center of Dominican Republic as default
  const center: [number, number] = [18.7357, -70.1627];
  const positions = withCoords.map((b) => [b.latitud!, b.longitud!] as [number, number]);

  return (
    <div className="h-80 rounded-xl overflow-hidden border border-slate-200">
      <MapContainer center={center} zoom={8} className="h-full w-full" scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={positions} />
        {withCoords.map((branch, i) => (
          <Marker
            key={branch.sucursalId}
            position={[branch.latitud!, branch.longitud!]}
            icon={createIcon(COLORS[i % COLORS.length])}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-bold text-slate-800 text-sm">{branch.nombre}</p>
                <p className="text-xs text-slate-400 font-mono mb-2">{branch.codigo}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Efectivo:</span>
                    <span className="font-bold text-slate-800">{formatCurrency(branch.efectivoTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cajas abiertas:</span>
                    <span className="font-medium text-blue-600">{branch.cajasAbiertas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cajas cerradas:</span>
                    <span className="font-medium text-slate-600">{branch.cajasCerradas}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
