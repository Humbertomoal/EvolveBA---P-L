// Shared constants and types for el módulo de Presupuesto (Fase 7).
// No server imports — safe to use in Client Components.

export type PresupuestoLineaDTO = {
  id: string;
  code: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  qty: number | null;
  unitPrice: number | null;
  amount: number; // presupuestado. Si isCalculated, viene de Σ Element.totalCost (regla #14)
  isCalculated: boolean;
  real: number; // Cost.amount de esa cuenta, o Σ TimeEntry.amount si es "2.8" (regla #11)
};

export type PresupuestoPartidaDTO = {
  id: string;
  code: string;
  name: string;
  order: number;
  lineas: PresupuestoLineaDTO[];
  amount: number; // Σ lineas.amount (derivado, nunca capturado)
  real: number; // Σ lineas.real
  elementosCount: number; // elementos activos asignados — bloquea eliminar si > 0
};

export type PartidaFormInput = {
  code: string;
  name: string;
  order: number;
};

export type LineaFormInput = {
  accountId: string;
  qty: number;
  unitPrice: number;
};

export function validarPartida(datos: PartidaFormInput): string | null {
  if (!datos.code.trim()) return "El código es requerido.";
  if (!datos.name.trim()) return "El nombre es requerido.";
  return null;
}

export function validarLinea(datos: LineaFormInput): string | null {
  if (!datos.accountId) return "La cuenta es requerida.";
  if (!Number.isFinite(datos.qty) || datos.qty <= 0) return "La cantidad debe ser mayor a 0.";
  if (!Number.isFinite(datos.unitPrice) || datos.unitPrice < 0) return "El precio unitario no puede ser negativo.";
  return null;
}

export function desviacion(real: number, presupuesto: number): number {
  return real - presupuesto;
}

export function pctConsumo(real: number, presupuesto: number): number {
  if (presupuesto <= 0) return real > 0 ? 100 : 0;
  return Math.round((real / presupuesto) * 1000) / 10;
}
