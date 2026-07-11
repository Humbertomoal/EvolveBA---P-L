import { prisma } from "./prisma";
import type { PresupuestoPartidaDTO } from "./presupuestoTypes";
import { getManoDeObraAplicadaProyecto } from "./getCostos";

// Reconstruye el árbol Partida → Líneas con "Real" y desviación. La línea
// "2.1 Materia prima" SIEMPRE se recalcula en vivo desde Σ Element.totalCost
// (regla #14) — el valor guardado en BudgetItem.amount es solo un caché de
// escritura (asignarElementoPartidaAction), nunca la fuente de verdad para
// mostrar. Igual de "Real" de "2.8 Nómina Operativa" viene de TimeEntry, nunca
// de Cost (regla #11).
export async function getPresupuestoProyecto(projectId: string, clienteId: string): Promise<PresupuestoPartidaDTO[]> {
  const [items, cuentas, costosPorCuenta, moAplicada, materiaPrimaPorPartida, elementosPorPartida] = await Promise.all([
    prisma.budgetItem.findMany({ where: { projectId }, orderBy: [{ order: "asc" }, { code: "asc" }] }),
    prisma.costAccount.findMany({ where: { clienteId, deletedAt: null } }),
    prisma.cost.groupBy({ by: ["accountId"], where: { projectId, deletedAt: null }, _sum: { amount: true } }),
    getManoDeObraAplicadaProyecto(projectId),
    prisma.element.groupBy({
      by: ["budgetItemId"],
      where: { projectId, deletedAt: null, budgetItemId: { not: null } },
      _sum: { totalCost: true },
    }),
    prisma.element.groupBy({
      by: ["budgetItemId"],
      where: { projectId, deletedAt: null, budgetItemId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const cuentaPorId = new Map(cuentas.map((c) => [c.id, c]));
  const realPorCuenta = new Map(costosPorCuenta.map((r) => [r.accountId, r._sum.amount?.toNumber() ?? 0]));
  const materiaPrimaPorPartidaId = new Map(
    materiaPrimaPorPartida.map((r) => [r.budgetItemId as string, r._sum.totalCost?.toNumber() ?? 0])
  );
  const elementosCountPorPartidaId = new Map(
    elementosPorPartida.map((r) => [r.budgetItemId as string, r._count._all])
  );
  const cuentaNominaOperativa = cuentas.find((c) => c.code === "2.8");

  const partidas = items.filter((i) => i.parentId === null);
  const lineasPorPartida = new Map<string, typeof items>();
  for (const i of items) {
    if (i.parentId) {
      const arr = lineasPorPartida.get(i.parentId) ?? [];
      arr.push(i);
      lineasPorPartida.set(i.parentId, arr);
    }
  }

  return partidas
    .sort((a, b) => a.order - b.order || a.code.localeCompare(b.code))
    .map((p) => {
      const lineas = (lineasPorPartida.get(p.id) ?? [])
        .sort((a, b) => a.order - b.order || a.code.localeCompare(b.code))
        .map((l) => {
          const cuenta = l.accountId ? cuentaPorId.get(l.accountId) : undefined;
          const amount = l.isCalculated ? materiaPrimaPorPartidaId.get(p.id) ?? 0 : l.amount.toNumber();
          const real =
            cuentaNominaOperativa && l.accountId === cuentaNominaOperativa.id
              ? moAplicada
              : l.accountId
                ? (realPorCuenta.get(l.accountId) ?? 0)
                : 0;
          return {
            id: l.id,
            code: l.code,
            accountId: l.accountId ?? "",
            accountCode: cuenta?.code ?? "",
            accountName: cuenta?.name ?? "",
            qty: l.qty ? l.qty.toNumber() : null,
            unitPrice: l.unitPrice ? l.unitPrice.toNumber() : null,
            amount,
            isCalculated: l.isCalculated,
            real,
          };
        });
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        order: p.order,
        lineas,
        amount: lineas.reduce((acc, l) => acc + l.amount, 0),
        real: lineas.reduce((acc, l) => acc + l.real, 0),
        elementosCount: elementosCountPorPartidaId.get(p.id) ?? 0,
      };
    });
}

export type PartidaSelectDTO = { id: string; code: string; name: string };

// Lista simple de partidas (nodos raíz) para el select de "asignar elemento a
// partida" en el tab Elementos.
export async function getPartidasProyecto(projectId: string): Promise<PartidaSelectDTO[]> {
  const partidas = await prisma.budgetItem.findMany({
    where: { projectId, parentId: null },
    select: { id: true, code: true, name: true },
    orderBy: [{ order: "asc" }, { code: "asc" }],
  });
  return partidas;
}
