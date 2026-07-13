// Shared constants, types and pure calculations for el módulo de Estimaciones
// (Fase 8 — el INGRESO). No server imports — safe to use en Client Components.
// Las mismas funciones se usan en el preview en vivo (cliente) y en el server
// action autoritativo (crearEstimacionAction/actualizarEstimacionAction).

export const ESTIMATE_STATUSES = [
  { value: "BORRADOR", label: "Borrador" },
  { value: "ENVIADA", label: "Enviada" },
  { value: "AUTORIZADA", label: "Autorizada" },
  { value: "PAGADA", label: "Pagada" },
] as const;

export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number]["value"];

// Solo estas cuentan como ingreso reconocido (regla #3).
export const ESTATUS_INGRESO: EstimateStatus[] = ["AUTORIZADA", "PAGADA"];

export type EstimacionDTO = {
  id: string;
  number: number;
  periodStart: string;
  periodEnd: string;
  progressPct: number; // avance acumulado, calculado y sellado al momento de crear/editar
  grossAmount: number;
  grossAmountManual: boolean;
  retention: number;
  advanceAmort: number;
  netAmount: number;
  status: EstimateStatus;
  authorizedAt: string | null;
  paidAt: string | null;
};

export type EstimacionListDTO = EstimacionDTO & {
  projectId: string;
  projectCode: string;
  projectName: string;
};

export type EstimacionFormInput = {
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  grossAmountOverride: number | null;
};

export type EstimacionPreviewDTO = {
  progressPct: number;
  avanceAnterior: number;
  periodoPct: number;
  grossAmount: number;
  grossAmountManual: boolean;
  retention: number;
  advanceAmort: number;
  netAmount: number;
  saldoAnticipoDisponible: number;
};

/**
 * Bruto: si se sobrescribe, se usa tal cual (regla: "permite sobrescribir el
 * bruto"). Si no, bruto = periodoPct × Project.contractAmount.
 */
export function calcularBruto(periodoPct: number, contractAmount: number, override: number | null): number {
  if (override !== null) return override;
  return Math.round(((periodoPct / 100) * contractAmount) * 100) / 100;
}

export function calcularRetencion(bruto: number, retentionPct: number): number {
  return Math.round(bruto * (retentionPct / 100) * 100) / 100;
}

/**
 * Amortización de anticipo: bruto × (advanceAmount / contractAmount), sin
 * exceder nunca el saldo que queda por amortizar (regla explícita). Si no hay
 * anticipo (advanceAmount = 0), la amortización es 0.
 */
export function calcularAmortizacion(
  bruto: number,
  advanceAmount: number,
  contractAmount: number,
  saldoAnticipoDisponible: number
): number {
  if (advanceAmount <= 0 || contractAmount <= 0) return 0;
  const calculada = bruto * (advanceAmount / contractAmount);
  const tope = Math.max(0, saldoAnticipoDisponible);
  return Math.round(Math.min(calculada, tope) * 100) / 100;
}

export function calcularNeto(bruto: number, retencion: number, amortizacion: number): number {
  return Math.round((bruto - retencion - amortizacion) * 100) / 100;
}

/**
 * Regla: el avance del periodo nunca puede ser negativo (no se puede
 * "desavanzar"). Mensaje EXACTO pedido por el usuario.
 */
export function validarAvanceNoNegativo(avanceActual: number, avanceAnterior: number): string | null {
  if (avanceActual < avanceAnterior) {
    return `El avance actual (${avanceActual}%) es menor al de la estimación anterior (${avanceAnterior}%).`;
  }
  return null;
}

export function validarPeriodo(periodStart: string, periodEnd: string): string | null {
  if (!periodStart || !periodEnd) return "El periodo es requerido.";
  if (new Date(periodStart) >= new Date(periodEnd)) {
    return "La fecha de inicio del periodo debe ser anterior a la fecha de fin.";
  }
  return null;
}

/**
 * Dos periodos [aStart,aEnd] y [bStart,bEnd] se traslapan si aStart <= bEnd Y
 * bStart <= aEnd (comparación de fechas, no de horas).
 */
export function periodosTraslapan(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
