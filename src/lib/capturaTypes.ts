// Shared constants, types and pure calculations for Captura de Obra
// (avance por etapas + horas-hombre). No server imports — safe to use in
// Client Components. Las mismas funciones se usan en el cliente (preview en
// vivo) y en el servidor (cálculo autoritativo dentro de la transacción).

export type EtapaCapturaDTO = {
  stageId: string;
  code: string;
  name: string;
  weightPct: number;
  order: number;
  qtyDone: number; // valor actual en BD (el "anterior")
};

export type EmpleadoCapturaDTO = {
  employeeId: string;
  name: string;
  role: string | null;
  crewId: string | null;
  crewNombre: string | null;
  hourlyCost: number;
  horas: number; // 0 si no hay TimeEntry para esta fecha+elemento
  marcado: boolean; // true si ya existe un TimeEntry (no eliminado) para esta fecha+elemento
};

export type EstadoCapturaDTO = {
  elemento: { id: string; code: string; name: string; qty: number };
  etapas: EtapaCapturaDTO[];
  empleados: EmpleadoCapturaDTO[];
};

export type ElementoParaCapturaDTO = {
  id: string;
  code: string;
  name: string;
};

export type GuardarCapturaInput = {
  elementId: string;
  date: string; // YYYY-MM-DD
  horas: { employeeId: string; hours: number }[];
  progreso: { stageId: string; qtyDone: number }[];
};

/**
 * Element.progressPct (regla #5): Σ(stage.weightPct × qtyDone / Element.qty).
 * Se usa tanto para el preview en vivo del panel de avance como para el
 * recálculo autoritativo en el server action — misma fórmula, un solo lugar.
 */
export function calcularElementProgressPct(
  qty: number,
  progreso: { weightPct: number; qtyDone: number }[]
): number {
  if (qty <= 0) return 0;
  const pct = progreso.reduce((acc, p) => acc + p.weightPct * (p.qtyDone / qty), 0);
  return Math.round(pct * 100) / 100;
}

/**
 * Regla #6: las etapas son acumulativas — a mayor `order`, el qtyDone no puede
 * ser mayor que el de la etapa anterior. También valida 0 <= qtyDone <= qty.
 * Se usa en cliente (feedback inmediato) y servidor (autoritativo).
 */
export function validarProgresoAcumulativo(
  etapas: { name: string; order: number; qtyDone: number }[],
  qty: number
): string | null {
  const ordenadas = [...etapas].sort((a, b) => a.order - b.order);
  for (const e of ordenadas) {
    if (!Number.isInteger(e.qtyDone) || e.qtyDone < 0 || e.qtyDone > qty) {
      return `"${e.name}" debe ser un entero entre 0 y ${qty}.`;
    }
  }
  for (let i = 1; i < ordenadas.length; i++) {
    const actual = ordenadas[i];
    const anterior = ordenadas[i - 1];
    if (actual.qtyDone > anterior.qtyDone) {
      return `No puedes tener ${actual.qtyDone} en "${actual.name}" si solo hay ${anterior.qtyDone} en "${anterior.name}".`;
    }
  }
  return null;
}
