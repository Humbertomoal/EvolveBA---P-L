import { prisma } from "./prisma";
import type { CostAccountDTO } from "./costAccountTypes";

export async function getCostAccounts(clienteId = "default"): Promise<CostAccountDTO[]> {
  const cuentas = await prisma.costAccount.findMany({
    where: { clienteId, deletedAt: null },
    orderBy: [{ level: "asc" }, { order: "asc" }],
  });

  return cuentas.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    level: c.level,
    parentId: c.parentId,
    order: c.order,
    isProject: c.isProject,
    isSystem: c.isSystem,
    active: c.active,
  }));
}
