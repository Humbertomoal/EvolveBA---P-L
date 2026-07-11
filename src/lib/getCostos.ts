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
export async function getManoDeObraAplicadaProyecto(projectId: string): Promise<number> {
  const entradas = await prisma.timeEntry.findMany({
    where: { projectId, deletedAt: null },
    select: { amount: true },
  });
  return entradas.reduce((acc, t) => acc + t.amount.toNumber(), 0);
}
