import { prisma } from "./prisma";
import { calcularAvancePct } from "./avanceProyecto";
import { getPresupuestoProyecto } from "./getPresupuesto";
import { getCostoDirectoProyecto, getCostosPorCuentaProyecto, getManoDeObraAplicadaProyecto } from "./getCostos";
import { getIngresoProyecto } from "./getEstimaciones";
import {
  calcularEac,
  pct,
  calcularMoOciosa,
  resolverRangoPeriodo,
  type CuentaEmpresaDTO,
  type CuentaPnlDTO,
  type PeriodoTipo,
  type PnlEmpresaDTO,
  type PnlProyectoDTO,
  type ProyectoComparativoDTO,
} from "./pnlTypes";

const CODIGO_NOMINA_OPERATIVA = "2.8";

// ── Parte A: P&L de un proyecto ─────────────────────────────────────────────
export async function getPnlProyecto(projectId: string, clienteId: string): Promise<PnlProyectoDTO | null> {
  const proyecto = await prisma.project.findFirst({
    where: { id: projectId, clienteId },
    select: { code: true, name: true, contractAmount: true },
  });
  if (!proyecto) return null;

  const [avancePct, ingreso, costoDirecto, moAplicada, costosPorCuenta, cuentas, presupuestoPartidas] = await Promise.all([
    calcularAvancePct(projectId),
    getIngresoProyecto(projectId),
    getCostoDirectoProyecto(projectId),
    getManoDeObraAplicadaProyecto(projectId),
    getCostosPorCuentaProyecto(projectId),
    prisma.costAccount.findMany({ where: { clienteId, deletedAt: null } }),
    getPresupuestoProyecto(projectId, clienteId),
  ]);

  const contractAmount = proyecto.contractAmount.toNumber();
  const costoReal = costoDirecto + moAplicada;
  const margenBruto = ingreso - costoReal;

  const cuentaPorId = new Map(cuentas.map((c) => [c.id, c]));
  const cuentaNominaOperativa = cuentas.find((c) => c.code === CODIGO_NOMINA_OPERATIVA);

  // Presupuesto por cuenta: Σ de las líneas (no de las partidas padre, regla
  // explícita de la fase — reutiliza getPresupuestoProyecto porque ya resuelve
  // correctamente la línea calculada "Materia prima" en vivo, regla #14).
  const presupuestoPorCuenta = new Map<string, number>();
  for (const partida of presupuestoPartidas) {
    for (const linea of partida.lineas) {
      presupuestoPorCuenta.set(linea.accountId, (presupuestoPorCuenta.get(linea.accountId) ?? 0) + linea.amount);
    }
  }
  const presupuestoTotal = presupuestoPartidas.reduce((acc, p) => acc + p.amount, 0);

  // Desglose por cuenta: unión de cuentas con costo real y/o presupuesto.
  // "2.8 Nómina Operativa" NUNCA toma su monto de costosPorCuenta (que viene
  // de Cost — regla #11 garantiza que esa cuenta jamás tiene filas ahí) sino
  // de moAplicada (TimeEntry), inyectada explícitamente aquí.
  const idsConMovimiento = new Set<string>([
    ...costosPorCuenta.map((c) => c.accountId),
    ...presupuestoPorCuenta.keys(),
  ]);
  if (cuentaNominaOperativa) idsConMovimiento.add(cuentaNominaOperativa.id);

  const montoPorCuenta = new Map(costosPorCuenta.map((c) => [c.accountId, c.monto]));
  if (cuentaNominaOperativa) montoPorCuenta.set(cuentaNominaOperativa.id, moAplicada);

  const costosPorCuentaDTO: CuentaPnlDTO[] = Array.from(idsConMovimiento)
    .map((accountId) => {
      const cuenta = cuentaPorId.get(accountId);
      const monto = montoPorCuenta.get(accountId) ?? 0;
      const presupuesto = presupuestoPorCuenta.get(accountId) ?? 0;
      return {
        accountId,
        accountCode: cuenta?.code ?? "",
        accountName: cuenta?.name ?? "",
        monto,
        presupuesto,
        pctConsumo: pct(monto, presupuesto),
        esCalculada: accountId === cuentaNominaOperativa?.id,
      };
    })
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const presupuestoDevengado = Math.round(presupuestoTotal * (avancePct / 100) * 100) / 100;
  const desviacion = Math.round((costoReal - presupuestoDevengado) * 100) / 100;
  const { eacCostoFinal, eacMargenProyectado, eacMargenPctProyectado } = calcularEac(costoReal, avancePct, contractAmount);

  return {
    projectId,
    projectCode: proyecto.code,
    projectName: proyecto.name,
    contractAmount,
    avancePct,
    ingreso,
    facturadoPct: pct(ingreso, contractAmount),
    costosPorCuenta: costosPorCuentaDTO,
    costoDirecto,
    moAplicada,
    costoReal,
    margenBruto,
    margenPct: pct(margenBruto, ingreso),
    presupuestoTotal,
    presupuestoDevengado,
    desviacion,
    eacCostoFinal,
    eacMargenProyectado,
    eacMargenPctProyectado,
  };
}

// ── Parte C: comparativo de proyectos ───────────────────────────────────────
// Reutiliza getPnlProyecto (ya optimizado con aggregate/groupBy) por proyecto,
// en paralelo — el número de proyectos activos es chico, evita duplicar la
// fórmula del margen/EAC en dos lugares.
export async function getComparativoProyectos(clienteId = "default"): Promise<ProyectoComparativoDTO[]> {
  const proyectos = await prisma.project.findMany({
    where: { clienteId, deletedAt: null },
    select: { id: true },
  });

  const pnls = await Promise.all(proyectos.map((p) => getPnlProyecto(p.id, clienteId)));

  return pnls
    .filter((p): p is PnlProyectoDTO => p !== null)
    .map((p) => ({
      projectId: p.projectId,
      projectCode: p.projectCode,
      projectName: p.projectName,
      contractAmount: p.contractAmount,
      facturado: p.ingreso,
      costoReal: p.costoReal,
      presupuestoTotal: p.presupuestoTotal,
      margen: p.margenBruto,
      margenPct: p.margenPct,
      avancePct: p.avancePct,
      desviacion: p.desviacion,
    }));
}

// ── Parte B: P&L de empresa ──────────────────────────────────────────────────
export async function getPnlEmpresa(
  clienteId: string,
  tipo: PeriodoTipo,
  anio: number,
  mes: number,
  desdeCustom?: string,
  hastaCustom?: string
): Promise<PnlEmpresaDTO> {
  const { desde, hasta, label } = resolverRangoPeriodo(tipo, anio, mes, desdeCustom, hastaCustom);

  const [ingresoAgg, costosPorCuenta, cuentas, moAplicadaAgg, nominaOperativaPagada] = await Promise.all([
    prisma.estimate.aggregate({
      where: {
        deletedAt: null,
        status: { in: ["AUTORIZADA", "PAGADA"] },
        project: { clienteId },
        periodEnd: { gte: desde, lte: hasta },
      },
      _sum: { grossAmount: true },
    }),
    prisma.cost.groupBy({
      by: ["accountId"],
      where: { deletedAt: null, account: { clienteId }, date: { gte: desde, lte: hasta } },
      _sum: { amount: true },
    }),
    prisma.costAccount.findMany({ where: { clienteId, deletedAt: null } }),
    prisma.timeEntry.aggregate({
      where: { deletedAt: null, project: { clienteId }, date: { gte: desde, lte: hasta } },
      _sum: { amount: true },
    }),
    sumaNominaPagadaEnRango(clienteId, "OPERATIVA", desde, hasta),
  ]);

  const ingreso = ingresoAgg._sum.grossAmount?.toNumber() ?? 0;
  const moAplicada = moAplicadaAgg._sum.amount?.toNumber() ?? 0;

  const montoPorCuenta = new Map(costosPorCuenta.map((g) => [g.accountId, g._sum.amount?.toNumber() ?? 0]));
  const cuentaNominaOperativa = cuentas.find((c) => c.code === CODIGO_NOMINA_OPERATIVA);

  function cuentasDeNivel(nivel: number): CuentaEmpresaDTO[] {
    return cuentas
      .filter((c) => c.level === nivel && c.parentId !== null) // solo hojas, no el nodo de grupo
      .map((c) => ({
        accountId: c.id,
        accountCode: c.code,
        accountName: c.name,
        monto: c.code === CODIGO_NOMINA_OPERATIVA ? moAplicada : (montoPorCuenta.get(c.id) ?? 0),
      }))
      .filter((c) => c.monto > 0)
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }

  const costosOperativos = cuentasDeNivel(2);
  const totalCostosOperativos = costosOperativos.reduce((acc, c) => acc + c.monto, 0);
  const margenBruto = ingreso - totalCostosOperativos;

  const gastosAdministrativos = cuentasDeNivel(3).reduce((acc, c) => acc + c.monto, 0);
  const publicidadMarketing = cuentasDeNivel(4).reduce((acc, c) => acc + c.monto, 0);
  const impuestos = cuentasDeNivel(5).reduce((acc, c) => acc + c.monto, 0);

  // Regla #12 — MO ociosa: solo tiene sentido si hay cuenta "2.8" en el
  // catálogo (siempre debería, viene del seed de Fase 6).
  const moOciosa = cuentaNominaOperativa ? calcularMoOciosa(nominaOperativaPagada, moAplicada) : 0;

  const utilidadNeta =
    Math.round((margenBruto - gastosAdministrativos - publicidadMarketing - moOciosa - impuestos) * 100) / 100;

  const evolucionMensual = await getEvolucionMensual(clienteId, desde, hasta);

  return {
    periodoLabel: label,
    periodoDesde: desde.toISOString(),
    periodoHasta: hasta.toISOString(),
    ingreso,
    costosOperativos,
    totalCostosOperativos,
    margenBruto,
    margenBrutoPct: pct(margenBruto, ingreso),
    gastosAdministrativos,
    publicidadMarketing,
    moOciosa,
    impuestos,
    utilidadNeta,
    utilidadNetaPct: pct(utilidadNeta, ingreso),
    evolucionMensual,
  };
}

// Nómina real pagada (PayrollPeriod) de un tipo, cuyos (year, month) caen
// dentro del rango de fechas dado.
async function sumaNominaPagadaEnRango(
  clienteId: string,
  type: "OPERATIVA" | "ADMINISTRATIVA",
  desde: Date,
  hasta: Date
): Promise<number> {
  const periodos = await prisma.payrollPeriod.findMany({
    where: { clienteId, type },
    select: { year: true, month: true, amount: true },
  });
  const dentroDelRango = periodos.filter((p) => {
    const inicioMes = new Date(Date.UTC(p.year, p.month - 1, 1));
    const finMes = new Date(Date.UTC(p.year, p.month, 0));
    return inicioMes <= hasta && finMes >= desde;
  });
  return dentroDelRango.reduce((acc, p) => acc + p.amount.toNumber(), 0);
}

// Evolución mensual de ingreso y costo real (empresa), para la gráfica de
// línea — un mes por cada mes calendario dentro del rango seleccionado.
async function getEvolucionMensual(
  clienteId: string,
  desde: Date,
  hasta: Date
): Promise<{ mes: string; ingreso: number; costo: number }[]> {
  const MESES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const meses: { anio: number; mes: number }[] = [];
  const cursor = new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), 1));
  const limite = new Date(Date.UTC(hasta.getUTCFullYear(), hasta.getUTCMonth(), 1));
  while (cursor <= limite && meses.length < 24) {
    meses.push({ anio: cursor.getUTCFullYear(), mes: cursor.getUTCMonth() + 1 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return Promise.all(
    meses.map(async ({ anio, mes }) => {
      const inicioMes = new Date(Date.UTC(anio, mes - 1, 1));
      const finMes = new Date(Date.UTC(anio, mes, 0));
      const [ingresoAgg, costoAgg, moAgg] = await Promise.all([
        prisma.estimate.aggregate({
          where: {
            deletedAt: null,
            status: { in: ["AUTORIZADA", "PAGADA"] },
            project: { clienteId },
            periodEnd: { gte: inicioMes, lte: finMes },
          },
          _sum: { grossAmount: true },
        }),
        prisma.cost.aggregate({
          where: { deletedAt: null, account: { clienteId }, date: { gte: inicioMes, lte: finMes } },
          _sum: { amount: true },
        }),
        prisma.timeEntry.aggregate({
          where: { deletedAt: null, project: { clienteId }, date: { gte: inicioMes, lte: finMes } },
          _sum: { amount: true },
        }),
      ]);
      return {
        mes: `${MESES_CORTO[mes - 1]} ${anio}`,
        ingreso: ingresoAgg._sum.grossAmount?.toNumber() ?? 0,
        costo: (costoAgg._sum.amount?.toNumber() ?? 0) + (moAgg._sum.amount?.toNumber() ?? 0),
      };
    })
  );
}
