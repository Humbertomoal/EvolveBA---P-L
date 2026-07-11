import { prisma } from "./prisma";
import type { ElementoParaCapturaDTO } from "./capturaTypes";

export async function getElementosParaCaptura(projectId: string): Promise<ElementoParaCapturaDTO[]> {
  const elementos = await prisma.element.findMany({
    where: { projectId, deletedAt: null },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
  return elementos;
}

export type ElementoDeProyectoDTO = { id: string; code: string; name: string; projectId: string };

// Todos los elementos de todos los proyectos del tenant, con su projectId —
// usado en el módulo de Costos (global) para poblar el select de Elemento
// según el proyecto elegido, sin ida y vuelta al servidor por cada cambio.
export async function getElementosTodosProyectos(clienteId = "default"): Promise<ElementoDeProyectoDTO[]> {
  const elementos = await prisma.element.findMany({
    where: { deletedAt: null, project: { clienteId } },
    select: { id: true, code: true, name: true, projectId: true },
    orderBy: { code: "asc" },
  });
  return elementos;
}

export type EtapaAvanceElementoDTO = {
  stageId: string;
  code: string;
  name: string;
  order: number;
  qtyDone: number;
};

export type ElementoConAvanceDTO = {
  id: string;
  code: string;
  name: string;
  type: string;
  qty: number;
  weight: number;
  progressPct: number;
  installedAt: string | null;
  etapas: EtapaAvanceElementoDTO[];
  horasAcumuladas: number;
  costoMoAcumulado: number;
  budgetItemId: string | null;
};

// Tab "Elementos" del detalle: consulta de solo lectura con avance por etapa
// y el acumulado de horas/costo de mano de obra por elemento (regla del "dato
// de oro" — se muestra aquí, sin reportes todavía).
export async function getElementosConAvance(projectId: string): Promise<ElementoConAvanceDTO[]> {
  const [elementos, etapas] = await Promise.all([
    prisma.element.findMany({
      where: { projectId, deletedAt: null },
      include: {
        progress: true,
        timeEntries: { where: { deletedAt: null }, select: { hours: true, amount: true } },
      },
      orderBy: { code: "asc" },
    }),
    prisma.elementStage.findMany({ orderBy: { order: "asc" } }),
  ]);

  return elementos.map((e) => {
    const progresoPorStage = new Map(e.progress.map((p) => [p.stageId, p.qtyDone]));
    const horasAcumuladas = e.timeEntries.reduce((acc, t) => acc + t.hours.toNumber(), 0);
    const costoMoAcumulado = e.timeEntries.reduce((acc, t) => acc + t.amount.toNumber(), 0);

    return {
      id: e.id,
      code: e.code,
      name: e.name,
      type: e.type,
      qty: e.qty,
      weight: e.weight.toNumber(),
      progressPct: e.progressPct.toNumber(),
      installedAt: e.installedAt ? e.installedAt.toISOString() : null,
      etapas: etapas.map((s) => ({
        stageId: s.id,
        code: s.code,
        name: s.name,
        order: s.order,
        qtyDone: progresoPorStage.get(s.id) ?? 0,
      })),
      horasAcumuladas,
      costoMoAcumulado,
      budgetItemId: e.budgetItemId,
    };
  });
}

export type TimeEntryHistorialDTO = {
  id: string;
  employeeId: string;
  employeeName: string;
  elementId: string | null;
  elementCode: string | null;
  date: string;
  hours: number;
  hourlyCost: number;
  amount: number;
  notes: string | null;
};

// Tab "Horas" del detalle: historial completo del proyecto, se filtra en el
// cliente (mismo patrón que el resto de las listas de este módulo).
export async function getHistorialHoras(projectId: string): Promise<TimeEntryHistorialDTO[]> {
  const entradas = await prisma.timeEntry.findMany({
    where: { projectId, deletedAt: null },
    include: { employee: { select: { name: true } }, element: { select: { code: true } } },
    orderBy: { date: "desc" },
  });

  return entradas.map((t) => ({
    id: t.id,
    employeeId: t.employeeId,
    employeeName: t.employee.name,
    elementId: t.elementId,
    elementCode: t.element?.code ?? null,
    date: t.date.toISOString(),
    hours: t.hours.toNumber(),
    hourlyCost: t.hourlyCost.toNumber(),
    amount: t.amount.toNumber(),
    notes: t.notes,
  }));
}
