"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getPermisoModulo } from "./permisos";
import { calcularElementProgressPct, validarProgresoAcumulativo } from "./capturaTypes";
import type { EstadoCapturaDTO, GuardarCapturaInput } from "./capturaTypes";

type TxClient = Prisma.TransactionClient;

// Carga combinada de los dos paneles (Horas + Avance) para un elemento y fecha
// específicos. Se llama desde el cliente cada vez que cambia el elemento o la
// fecha en el encabezado de Captura.
export async function getEstadoCapturaAction(
  projectId: string,
  clienteId: string,
  elementId: string,
  dateISO: string
): Promise<{ ok: boolean; error?: string; estado?: EstadoCapturaDTO }> {
  const permiso = await getPermisoModulo("captura");
  if (!permiso.ver) return { ok: false, error: "No tienes permiso para ver la captura." };

  const elemento = await prisma.element.findFirst({
    where: { id: elementId, projectId, deletedAt: null, project: { clienteId } },
  });
  if (!elemento) return { ok: false, error: "Elemento no encontrado." };

  const fecha = new Date(dateISO);
  if (Number.isNaN(fecha.getTime())) return { ok: false, error: "Fecha inválida." };

  const [stages, progresoActual, asignaciones, horasExistentes] = await Promise.all([
    prisma.elementStage.findMany({ where: { clienteId }, orderBy: { order: "asc" } }),
    prisma.elementProgress.findMany({ where: { elementId } }),
    prisma.projectAssignment.findMany({
      where: { projectId, removedAt: null },
      include: { employee: { include: { crew: { select: { name: true } } } } },
    }),
    prisma.timeEntry.findMany({
      where: { projectId, elementId, date: fecha, deletedAt: null },
    }),
  ]);

  const progresoPorStage = new Map(progresoActual.map((p) => [p.stageId, p.qtyDone]));
  const horasPorEmpleado = new Map(horasExistentes.map((h) => [h.employeeId, h.hours.toNumber()]));

  const estado: EstadoCapturaDTO = {
    elemento: { id: elemento.id, code: elemento.code, name: elemento.name, qty: elemento.qty },
    etapas: stages.map((s) => ({
      stageId: s.id,
      code: s.code,
      name: s.name,
      weightPct: s.weightPct.toNumber(),
      order: s.order,
      qtyDone: progresoPorStage.get(s.id) ?? 0,
    })),
    empleados: asignaciones.map((a) => ({
      employeeId: a.employeeId,
      name: a.employee.name,
      role: a.employee.role,
      crewId: a.employee.crewId,
      crewNombre: a.employee.crew?.name ?? null,
      hourlyCost: a.employee.hourlyCost.toNumber(),
      horas: horasPorEmpleado.get(a.employeeId) ?? 0,
      marcado: horasPorEmpleado.has(a.employeeId),
    })),
  };

  return { ok: true, estado };
}

// Crea/actualiza/revive el TimeEntry de un empleado para (proyecto, elemento,
// fecha). hourlyCost es SNAPSHOT (regla #2): en un renglón activo que ya
// existía, se preserva tal cual — solo se recalcula `amount` con las horas
// nuevas. Si es nuevo (o estaba soft-deleted, "revivirlo" cuenta como una
// captura nueva) se copia el Employee.hourlyCost vigente en ese momento.
async function guardarHoraEmpleado(
  tx: TxClient,
  projectId: string,
  elementId: string,
  fecha: Date,
  employeeId: string,
  hours: number
) {
  const existente = await tx.timeEntry.findFirst({
    where: { projectId, employeeId, elementId, date: fecha },
  });

  if (existente && existente.deletedAt === null) {
    const hourlyCost = existente.hourlyCost.toNumber();
    await tx.timeEntry.update({
      where: { id: existente.id },
      data: { hours, amount: hours * hourlyCost },
    });
    return;
  }

  const employee = await tx.employee.findUniqueOrThrow({ where: { id: employeeId } });
  const hourlyCost = employee.hourlyCost.toNumber();

  if (existente) {
    // Revive un renglón previamente eliminado con snapshot fresco.
    await tx.timeEntry.update({
      where: { id: existente.id },
      data: { hours, hourlyCost, amount: hours * hourlyCost, deletedAt: null },
    });
  } else {
    await tx.timeEntry.create({
      data: { projectId, employeeId, elementId, date: fecha, hours, hourlyCost, amount: hours * hourlyCost },
    });
  }
}

// El guardado de la pantalla de Captura: TimeEntry (uno por empleado marcado)
// + ElementProgress + recálculo de Element.progressPct (y de installedAt), en
// una sola transacción. Si algo falla (avance no acumulativo, empleado ya no
// asignado, etc.) no se guarda nada.
export async function guardarCapturaAction(
  projectId: string,
  clienteId: string,
  input: GuardarCapturaInput
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("captura");
  if (!permiso.crear && !permiso.editar) {
    return { ok: false, error: "No tienes permiso para capturar avance u horas." };
  }

  const fecha = new Date(input.date);
  if (Number.isNaN(fecha.getTime())) return { ok: false, error: "Fecha inválida." };

  for (const h of input.horas) {
    if (!Number.isFinite(h.hours) || h.hours <= 0 || h.hours > 24) {
      return { ok: false, error: "Las horas de cada empleado deben ser mayores a 0 y no más de 24." };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const elemento = await tx.element.findFirst({
        where: { id: input.elementId, projectId, deletedAt: null, project: { clienteId } },
      });
      if (!elemento) throw new Error("Elemento no encontrado.");

      if (input.horas.length > 0) {
        const asignados = await tx.projectAssignment.findMany({
          where: {
            projectId,
            removedAt: null,
            employeeId: { in: input.horas.map((h) => h.employeeId) },
          },
          select: { employeeId: true },
        });
        const asignadosIds = new Set(asignados.map((a) => a.employeeId));
        for (const h of input.horas) {
          if (!asignadosIds.has(h.employeeId)) {
            throw new Error("Uno de los empleados marcados ya no está asignado a este proyecto.");
          }
        }
      }

      const stages = await tx.elementStage.findMany({ where: { clienteId }, orderBy: { order: "asc" } });
      const stagesPorId = new Map(stages.map((s) => [s.id, s]));

      const progresoConNombre = input.progreso.map((p) => {
        const stage = stagesPorId.get(p.stageId);
        if (!stage) throw new Error("Etapa no encontrada en el catálogo.");
        return { name: stage.name, order: stage.order, qtyDone: p.qtyDone };
      });
      const errorProgreso = validarProgresoAcumulativo(progresoConNombre, elemento.qty);
      if (errorProgreso) throw new Error(errorProgreso);

      for (const h of input.horas) {
        await guardarHoraEmpleado(tx, projectId, input.elementId, fecha, h.employeeId, h.hours);
      }

      for (const p of input.progreso) {
        await tx.elementProgress.upsert({
          where: { elementId_stageId: { elementId: input.elementId, stageId: p.stageId } },
          update: { qtyDone: p.qtyDone },
          create: { elementId: input.elementId, stageId: p.stageId, qtyDone: p.qtyDone },
        });
      }

      const nuevoProgressPct = calcularElementProgressPct(
        elemento.qty,
        input.progreso.map((p) => ({
          weightPct: stagesPorId.get(p.stageId)!.weightPct.toNumber(),
          qtyDone: p.qtyDone,
        }))
      );

      const stageMontado = stages.find((s) => s.code === "MONTADO");
      const qtyMontado = stageMontado
        ? (input.progreso.find((p) => p.stageId === stageMontado.id)?.qtyDone ?? 0)
        : 0;
      const completo = !!stageMontado && qtyMontado >= elemento.qty;

      await tx.element.update({
        where: { id: input.elementId },
        data: {
          progressPct: nuevoProgressPct,
          installedAt: completo ? (elemento.installedAt ?? new Date()) : null,
        },
      });
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e: unknown) {
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: "Error al guardar la captura." };
  }
}

// ── Tab Horas: edición/eliminación del historial ────────────────────────────
// Gateado por el módulo "horas-hombre" (no "captura"): esto es administrar el
// historial ya capturado, no la pantalla de captura del día.

export async function actualizarTimeEntryAction(
  id: string,
  clienteId: string,
  hours: number
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("horas-hombre");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para editar horas." };

  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return { ok: false, error: "Las horas deben ser mayores a 0 y no más de 24." };
  }

  const entrada = await prisma.timeEntry.findFirst({
    where: { id, deletedAt: null, project: { clienteId } },
  });
  if (!entrada) return { ok: false, error: "Registro no encontrado." };

  await prisma.timeEntry.update({
    where: { id },
    data: { hours, amount: hours * entrada.hourlyCost.toNumber() },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function eliminarTimeEntryAction(
  id: string,
  clienteId: string
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("horas-hombre");
  if (!permiso.eliminar) return { ok: false, error: "No tienes permiso para eliminar horas." };

  const entrada = await prisma.timeEntry.findFirst({
    where: { id, deletedAt: null, project: { clienteId } },
  });
  if (!entrada) return { ok: false, error: "Registro no encontrado." };

  await prisma.timeEntry.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/", "layout");
  return { ok: true };
}
