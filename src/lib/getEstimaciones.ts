import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { ESTATUS_INGRESO, type EstimacionDTO, type EstimacionListDTO, type EstimateStatus } from "./estimacionesTypes";

type DbClient = Prisma.TransactionClient | typeof prisma;

function aDTO(e: {
  id: string;
  number: number;
  periodStart: Date;
  periodEnd: Date;
  progressPct: { toNumber(): number };
  grossAmount: { toNumber(): number };
  grossAmountManual: boolean;
  retention: { toNumber(): number };
  advanceAmort: { toNumber(): number };
  netAmount: { toNumber(): number };
  status: string;
  authorizedAt: Date | null;
  paidAt: Date | null;
}): EstimacionDTO {
  return {
    id: e.id,
    number: e.number,
    periodStart: e.periodStart.toISOString(),
    periodEnd: e.periodEnd.toISOString(),
    progressPct: e.progressPct.toNumber(),
    grossAmount: e.grossAmount.toNumber(),
    grossAmountManual: e.grossAmountManual,
    retention: e.retention.toNumber(),
    advanceAmort: e.advanceAmort.toNumber(),
    netAmount: e.netAmount.toNumber(),
    status: e.status as EstimateStatus,
    authorizedAt: e.authorizedAt ? e.authorizedAt.toISOString() : null,
    paidAt: e.paidAt ? e.paidAt.toISOString() : null,
  };
}

export async function getEstimacionesProyecto(projectId: string): Promise<EstimacionDTO[]> {
  const estimaciones = await prisma.estimate.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { number: "asc" },
  });
  return estimaciones.map(aDTO);
}

// La última estimación ACEPTADA (autorizada o pagada) por fecha de periodo —
// fuente del "avance anterior" para la siguiente estimación (regla del
// enunciado: "de la última estimación autorizada/pagada").
export async function getUltimaEstimacionAceptada(projectId: string, db: DbClient = prisma) {
  return db.estimate.findFirst({
    where: { projectId, deletedAt: null, status: { in: ESTATUS_INGRESO } },
    orderBy: [{ periodEnd: "desc" }, { number: "desc" }],
  });
}

export type ResumenFacturacionDTO = {
  contractAmount: number;
  facturado: number;
  porFacturar: number;
  advanceAmount: number;
  amortizado: number;
  saldoAnticipo: number;
  retenidoAcumulado: number;
};

// Cards del tab Resumen: solo cuentan AUTORIZADA/PAGADA (regla #3) — un
// Borrador o Enviada no mueve ni el "facturado" ni el saldo de anticipo real.
// Un solo aggregate (3 sumas en la misma consulta) en vez de traer cada
// Estimate a memoria.
export async function getResumenFacturacion(projectId: string): Promise<ResumenFacturacionDTO> {
  const [proyecto, aceptadas] = await Promise.all([
    prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { contractAmount: true, advanceAmount: true },
    }),
    prisma.estimate.aggregate({
      where: { projectId, deletedAt: null, status: { in: ESTATUS_INGRESO } },
      _sum: { grossAmount: true, retention: true, advanceAmort: true },
    }),
  ]);

  const contractAmount = proyecto.contractAmount.toNumber();
  const advanceAmount = proyecto.advanceAmount.toNumber();
  const facturado = aceptadas._sum.grossAmount?.toNumber() ?? 0;
  const retenidoAcumulado = aceptadas._sum.retention?.toNumber() ?? 0;
  const amortizado = aceptadas._sum.advanceAmort?.toNumber() ?? 0;

  return {
    contractAmount,
    facturado,
    porFacturar: contractAmount - facturado,
    advanceAmount,
    amortizado,
    saldoAnticipo: advanceAmount - amortizado,
    retenidoAcumulado,
  };
}

// Ingreso reconocido de un proyecto (regla #3) — agregado en BD.
export async function getIngresoProyecto(projectId: string): Promise<number> {
  const resultado = await prisma.estimate.aggregate({
    where: { projectId, deletedAt: null, status: { in: ESTATUS_INGRESO } },
    _sum: { grossAmount: true },
  });
  return resultado._sum.grossAmount?.toNumber() ?? 0;
}

// Módulo global (/estimaciones): todas las estimaciones de todos los
// proyectos del tenant — la vista del área de cobranza.
export async function getEstimacionesTodosProyectos(clienteId = "default"): Promise<EstimacionListDTO[]> {
  const estimaciones = await prisma.estimate.findMany({
    where: { deletedAt: null, project: { clienteId, deletedAt: null } },
    include: { project: { select: { code: true, name: true } } },
    orderBy: [{ periodEnd: "desc" }, { number: "desc" }],
  });
  return estimaciones.map((e) => ({
    ...aDTO(e),
    projectId: e.projectId,
    projectCode: e.project.code,
    projectName: e.project.name,
  }));
}
