import { prisma } from "./prisma";

/**
 * Avance % de un proyecto, ponderado por PESO (regla #8):
 *
 *   Avance = Σ(Element.weight × qty × progressPct) / Σ(Element.weight × qty)
 *
 * Lee `Element.progressPct`, que ya está actualizado en BD (se recalcula al
 * guardar una captura — ver capturaActions.ts) — no vuelve a leer
 * ElementProgress aquí, evita duplicar la fórmula de la regla #5.
 */
export async function calcularAvancePct(projectId: string): Promise<number> {
  const elementos = await prisma.element.findMany({
    where: { projectId, deletedAt: null },
    select: { weight: true, qty: true, progressPct: true },
  });

  let sumaPeso = 0;
  let sumaPesoPonderado = 0;
  for (const e of elementos) {
    const pesoTotal = e.weight.toNumber() * e.qty;
    sumaPeso += pesoTotal;
    sumaPesoPonderado += pesoTotal * e.progressPct.toNumber();
  }

  if (sumaPeso === 0) return 0;
  return Math.round((sumaPesoPonderado / sumaPeso) * 100) / 100;
}
