// Shared constants and types for el módulo de Nómina (Fase 6).
// No server imports — safe to use in Client Components.

export const PAYROLL_TYPES = [
  { value: "OPERATIVA", label: "Operativa" },
  { value: "ADMINISTRATIVA", label: "Administrativa" },
] as const;

export type PayrollType = (typeof PAYROLL_TYPES)[number]["value"];

export type PayrollPeriodDTO = {
  id: string;
  year: number;
  month: number;
  type: PayrollType;
  amount: number;
  notes: string | null;
};

export type PayrollFormInput = {
  year: number;
  month: number;
  type: PayrollType;
  amount: number;
  notes: string | null;
};

// Regla #12: MO aplicada (Σ TimeEntry del mes) vs nómina real (PayrollPeriod
// OPERATIVA). Ociosidad = real − aplicada. Negativa = hourlyCost sobreestimado.
export type ComparativoMesDTO = {
  year: number;
  month: number;
  nominaReal: number;
  moAplicada: number;
  ociosidad: number;
  ociosidadPct: number;
};

export function calcularComparativo(nominaReal: number, moAplicada: number): { ociosidad: number; ociosidadPct: number } {
  const ociosidad = nominaReal - moAplicada;
  const ociosidadPct = nominaReal > 0 ? Math.round((ociosidad / nominaReal) * 1000) / 10 : 0;
  return { ociosidad, ociosidadPct };
}

export function validarPayroll(datos: PayrollFormInput): string | null {
  if (!Number.isInteger(datos.year) || datos.year < 2000) return "El año no es válido.";
  if (!Number.isInteger(datos.month) || datos.month < 1 || datos.month > 12) return "El mes no es válido.";
  if (!Number.isFinite(datos.amount) || datos.amount <= 0) return "El monto debe ser mayor a 0.";
  return null;
}
