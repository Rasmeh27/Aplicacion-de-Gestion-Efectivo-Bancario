const CACHE_KEY = "branch-geocode-cache-v1";
const COUNTRY_HINT = "República Dominicana";

type CacheStore = Record<string, { latitud: number; longitud: number }>;

function normalizeAddress(address: string): string {
  return address.trim().replace(/\s+/g, " ").toLowerCase();
}

function readCache(): CacheStore {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CacheStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: CacheStore): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore cache write failures
  }
}

export async function geocodeDominicanAddress(address: string): Promise<{ latitud: number; longitud: number }> {
  const normalized = normalizeAddress(address);
  if (!normalized) {
    throw new Error("Debes indicar una dirección para ubicar la sucursal en el mapa.");
  }

  const cache = readCache();
  if (cache[normalized]) {
    return cache[normalized];
  }

  const query = `${address.trim()}, ${COUNTRY_HINT}`;
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=do&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Language": "es-DO,es;q=0.9,en;q=0.8",
      },
    }
  );

  if (!response.ok) {
    throw new Error("No se pudo consultar la ubicación de la dirección.");
  }

  const data = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  const first = data[0];
  const latitud = Number(first?.lat ?? NaN);
  const longitud = Number(first?.lon ?? NaN);

  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
    throw new Error("No se pudo ubicar la dirección indicada en el mapa. Revisa que esté completa.");
  }

  const result = { latitud, longitud };
  cache[normalized] = result;
  writeCache(cache);
  return result;
}
