/**
 * Generates preview codes for entities (frontend-only, for display purposes).
 * The backend is the source of truth for the final unique code.
 */

export function generateSucursalCodePreview(nombre: string): string {
  const cleaned = nombre.replace(/sucursal/gi, "").trim().toUpperCase();
  const letters = cleaned.replace(/[^A-Z]/g, "");
  const prefix = (letters.slice(0, 3) || "SUC").padEnd(3, "X");
  return `${prefix}-001`;
}

export function generateCajaCodePreview(
  sucursalCodigo: string | undefined,
  moneda: string
): string {
  const prefix = `${sucursalCodigo ?? "CAJ"}-${moneda.toUpperCase()}-`;
  return `${prefix}01`;
}

export function generateAtmCodePreview(
  sucursalCodigo: string | undefined
): string {
  const prefix = `ATM-${sucursalCodigo ?? "GEN"}-`;
  return `${prefix}001`;
}
