// Shared constants, types and pure calculations for el Dashboard P&L
// (Fase 9 — junta todo). No server imports — safe to use en Client Components.
// Las fórmulas viven aquí una sola vez y las usan tanto el P&L por proyecto
// (Parte A) como el P&L de empresa (Parte B) y el comparativo (Parte C).

export type CuentaPnlDTO = {
  accountId: string;
  accountCode: string;
  accountName: string;
  monto: number;
  presupuesto: number;
  pctConsumo: number; // monto / presupuesto × 100
  esCalculada: boolean; // true = "2.8 Nómina Operativa", viene de TimeEntry no de Cost
};

export type PnlProyectoDTO = {
  projectId: string;
  projectCode: string;
  projectName: string;
  contractAmount: number;
  avancePct: number;

  ingreso: number;
  facturadoPct: number; // ingreso / contractAmount × 100

  costosPorCuenta: CuentaPnlDTO[];
  costoDirecto: number; // Σ Cost.amount
  moAplicada: number; // Σ TimeEntry.amount (regla #11 — nunca desde Cost)
  costoReal: number; // costoDirecto + moAplicada

  margenBruto: number; // ingreso - costoReal
  margenPct: number; // margenBruto / ingreso × 100

  presupuestoTotal: number; // Σ BudgetItem.amount a nivel línea
  presupuestoDevengado: number; // presupuestoTotal × avancePct/100
  desviacion: number; // costoReal - presupuestoDevengado

  eacCostoFinal: number; // costoReal / (avancePct/100) — proyección al cierre
  eacMargenProyectado: number; // contractAmount - eacCostoFinal
  eacMargenPctProyectado: number;
};

export type ProyectoComparativoDTO = {
  projectId: string;
  projectCode: string;
  projectName: string;
  contractAmount: number;
  facturado: number;
  costoReal: number;
  presupuestoTotal: number;
  margen: number;
  margenPct: number;
  avancePct: number;
  desviacion: number;
};

export const PERIODO_TIPOS = [
  { value: "MES", label: "Mes" },
  { value: "TRIMESTRE", label: "Trimestre" },
  { value: "ANIO", label: "Año" },
  { value: "CUSTOM", label: "Rango personalizado" },
] as const;

export type PeriodoTipo = (typeof PERIODO_TIPOS)[number]["value"];

export type CuentaEmpresaDTO = {
  accountId: string;
  accountCode: string;
  accountName: string;
  monto: number;
};

export type PnlEmpresaDTO = {
  periodoLabel: string;
  periodoDesde: string;
  periodoHasta: string;

  ingreso: number;

  costosOperativos: CuentaEmpresaDTO[]; // nivel 2, incluye "2.8 Nómina Operativa" desde TimeEntry
  totalCostosOperativos: number;
  margenBruto: number;
  margenBrutoPct: number;

  gastosAdministrativos: number; // nivel 3
  publicidadMarketing: number; // nivel 4
  moOciosa: number; // regla #12 — PayrollPeriod(OPERATIVA) - Σ TimeEntry, solo empresa
  impuestos: number; // nivel 5

  utilidadNeta: number;
  utilidadNetaPct: number;

  evolucionMensual: { mes: string; ingreso: number; costo: number }[];
};

/**
 * Semáforo de margen: rojo si < 10%, amarillo 10-20%, verde > 20% (spec
 * explícita, valores ajustables si el negocio cambia de criterio).
 */
export function semaforoMargen(margenPct: number): "rojo" | "amarillo" | "verde" {
  if (margenPct < 10) return "rojo";
  if (margenPct < 20) return "amarillo";
  return "verde";
}

/** Desviación presupuestal: rojo si te pasaste (costo real > presupuesto devengado). */
export function semaforoDesviacion(desviacion: number): "rojo" | "verde" {
  return desviacion > 0 ? "rojo" : "verde";
}

export function pct(parte: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((parte / total) * 1000) / 10;
}

/**
 * EAC (Estimate At Completion) — proyección de costo final si el ritmo de
 * gasto por punto de avance se mantiene: costoReal / avance%. Si avancePct=0
 * no hay con qué proyectar (evita división entre cero).
 */
export function calcularEac(costoReal: number, avancePct: number, contractAmount: number) {
  if (avancePct <= 0) {
    return { eacCostoFinal: 0, eacMargenProyectado: contractAmount, eacMargenPctProyectado: 0 };
  }
  const eacCostoFinal = Math.round((costoReal / (avancePct / 100)) * 100) / 100;
  const eacMargenProyectado = Math.round((contractAmount - eacCostoFinal) * 100) / 100;
  const eacMargenPctProyectado = pct(eacMargenProyectado, contractAmount);
  return { eacCostoFinal, eacMargenProyectado, eacMargenPctProyectado };
}

/**
 * Regla #12 — MO ociosa: nómina operativa PAGADA que no se cargó a ninguna
 * obra. Negativa = hourlyCost de plantilla sobreestimado (se aplicó más de
 * lo que realmente se pagó). Vive SOLO a nivel empresa, nunca se resta del
 * costo de un proyecto individual.
 */
export function calcularMoOciosa(nominaReal: number, moAplicada: number): number {
  return Math.round((nominaReal - moAplicada) * 100) / 100;
}

/** Rango de fechas [desde, hasta] a partir de un tipo de periodo + ancla. */
export function resolverRangoPeriodo(
  tipo: PeriodoTipo,
  anio: number,
  mes: number, // 1-12, usado si tipo=MES o para ubicar el trimestre
  desdeCustom?: string,
  hastaCustom?: string
): { desde: Date; hasta: Date; label: string } {
  const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  if (tipo === "CUSTOM" && desdeCustom && hastaCustom) {
    return {
      desde: new Date(desdeCustom),
      hasta: new Date(hastaCustom),
      label: `${desdeCustom} a ${hastaCustom}`,
    };
  }

  if (tipo === "ANIO") {
    return {
      desde: new Date(Date.UTC(anio, 0, 1)),
      hasta: new Date(Date.UTC(anio, 11, 31)),
      label: `${anio}`,
    };
  }

  if (tipo === "TRIMESTRE") {
    const trimestre = Math.ceil(mes / 3);
    const mesInicio = (trimestre - 1) * 3; // 0-indexed
    return {
      desde: new Date(Date.UTC(anio, mesInicio, 1)),
      hasta: new Date(Date.UTC(anio, mesInicio + 3, 0)),
      label: `T${trimestre} ${anio}`,
    };
  }

  // MES
  return {
    desde: new Date(Date.UTC(anio, mes - 1, 1)),
    hasta: new Date(Date.UTC(anio, mes, 0)),
    label: `${MESES[mes - 1]} ${anio}`,
  };
}
