import { prisma } from "./prisma";
import type { CostoDTO } from "./costosTypes";

function aDTO(c: {
  id: string;
  date: Date;
  accountId: string;
  account: { code: string; name: string };
  projectId: string | null;
  project: { code: string; name: string } | null;
  elementId: string | null;
  element: { code: string } | null;
  supplierName: string | null;
  description: string;
  invoiceRef: string | null;
  amount: { toNumber(): number };
  paidAt: Date | null;
}): CostoDTO {
  return {
    id: c.id,
    date: c.date.toISOString(),
    accountId: c.accountId,
    accountCode: c.account.code,
    accountName: c.account.name,
    projectId: c.projectId,
    projectCode: c.project?.code ?? null,
    projectName: c.project?.name ?? null,
    elementId: c.elementId,
    elementCode: c.element?.code ?? null,
    supplierName: c.supplierName,
    description: c.description,
    invoiceRef: c.invoiceRef,
    amount: c.amount.toNumber(),
    paidAt: c.paidAt ? c.paidAt.toISOString() : null,
  };
}

// Lista general del módulo Costos: se filtra en el cliente (mismo patrón que
// el resto de las listas del sistema).
export async function getCostos(clienteId = "default"): Promise<CostoDTO[]> {
  const costos = await prisma.cost.findMany({
    where: { deletedAt: null, account: { clienteId } },
    include: {
      account: { select: { code: true, name: true } },
      project: { select: { code: true, name: true } },
      element: { select: { code: true } },
    },
    orderBy: { date: "desc" },
  });
  return costos.map(aDTO);
}

// Costos de un proyecto específico, para el tab "Costos" del detalle.
export async function getCostosProyecto(projectId: string): Promise<CostoDTO[]> {
  const costos = await prisma.cost.findMany({
    where: { projectId, deletedAt: null },
    include: {
      account: { select: { code: true, name: true } },
      project: { select: { code: true, name: true } },
      element: { select: { code: true } },
    },
    orderBy: { date: "desc" },
  });
  return costos.map(aDTO);
}

// MO aplicada (Σ TimeEntry.amount) del proyecto — regla #11: se muestra como
// línea calculada de "Nómina Operativa" (2.8), nunca se guarda como Cost.
// Agregado en BD (no trae filas a memoria) — Fase 9 lo usa en cada carga del
// P&L, tanto por proyecto como en el comparativo de todos los proyectos.
export async function getManoDeObraAplicadaProyecto(projectId: string): Promise<number> {
  const resultado = await prisma.timeEntry.aggregate({
    where: { projectId, deletedAt: null },
    _sum: { amount: true },
  });
  return resultado._sum.amount?.toNumber() ?? 0;
}

// Costo directo total del proyecto (Σ Cost.amount, todas las cuentas) —
// agregado en BD, usado en el P&L (regla: costo real = directo + MO aplicada).
export async function getCostoDirectoProyecto(projectId: string): Promise<number> {
  const resultado = await prisma.cost.aggregate({
    where: { projectId, deletedAt: null },
    _sum: { amount: true },
  });
  return resultado._sum.amount?.toNumber() ?? 0;
}

export type CuentaMontoDTO = { accountId: string; monto: number };

// Costo directo agrupado por cuenta (para el desglose del P&L) — un solo
// groupBy en vez de traer cada Cost individual y sumar en JS.
export async function getCostosPorCuentaProyecto(projectId: string): Promise<CuentaMontoDTO[]> {
  const grupos = await prisma.cost.groupBy({
    by: ["accountId"],
    where: { projectId, deletedAt: null },
    _sum: { amount: true },
  });
  return grupos.map((g) => ({ accountId: g.accountId, monto: g._sum.amount?.toNumber() ?? 0 }));
}
