"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getPermisoModulo } from "./permisos";
import type { ProyectoFormInput } from "./proyectosTypes";

function validarProyecto(datos: ProyectoFormInput): string | null {
  if (!datos.code.trim()) return "El código es requerido.";
  if (!datos.name.trim()) return "El nombre es requerido.";
  if (!datos.clientName.trim()) return "El cliente es requerido.";
  if (!Number.isFinite(datos.contractAmount) || datos.contractAmount <= 0) {
    return "El monto del contrato debe ser mayor a 0.";
  }
  if (
    !Number.isFinite(datos.advanceAmount) ||
    datos.advanceAmount < 0 ||
    datos.advanceAmount > datos.contractAmount
  ) {
    return "El anticipo debe estar entre 0 y el monto del contrato.";
  }
  if (!Number.isFinite(datos.retentionPct) || datos.retentionPct < 0 || datos.retentionPct > 100) {
    return "La retención debe estar entre 0 y 100%.";
  }
  if (!datos.startDate) return "La fecha de inicio es requerida.";
  if (datos.endDate && new Date(datos.endDate) <= new Date(datos.startDate)) {
    return "La fecha de fin debe ser posterior a la fecha de inicio.";
  }
  return null;
}

export async function crearProyectoAction(
  clienteId: string,
  datos: ProyectoFormInput
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("proyectos");
  if (!permiso.crear) return { ok: false, error: "No tienes permiso para crear proyectos." };

  const error = validarProyecto(datos);
  if (error) return { ok: false, error };

  try {
    await prisma.project.create({
      data: {
        clienteId,
        code: datos.code.trim(),
        name: datos.name.trim(),
        clientName: datos.clientName.trim(),
        type: datos.type,
        contractAmount: datos.contractAmount,
        advanceAmount: datos.advanceAmount,
        retentionPct: datos.retentionPct,
        startDate: new Date(datos.startDate),
        endDate: datos.endDate ? new Date(datos.endDate) : null,
        status: datos.status,
        notes: datos.notes?.trim() || null,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe un proyecto con ese código." };
    }
    return { ok: false, error: "Error al crear el proyecto." };
  }
}

export async function actualizarProyectoAction(
  id: string,
  clienteId: string,
  datos: ProyectoFormInput
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("proyectos");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para editar proyectos." };

  const error = validarProyecto(datos);
  if (error) return { ok: false, error };

  try {
    await prisma.project.update({
      where: { id, clienteId },
      data: {
        code: datos.code.trim(),
        name: datos.name.trim(),
        clientName: datos.clientName.trim(),
        type: datos.type,
        contractAmount: datos.contractAmount,
        advanceAmount: datos.advanceAmount,
        retentionPct: datos.retentionPct,
        startDate: new Date(datos.startDate),
        endDate: datos.endDate ? new Date(datos.endDate) : null,
        status: datos.status,
        notes: datos.notes?.trim() || null,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe un proyecto con ese código." };
    }
    return { ok: false, error: "Error al actualizar el proyecto." };
  }
}

export async function eliminarProyectoAction(
  id: string,
  clienteId: string
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("proyectos");
  if (!permiso.eliminar) return { ok: false, error: "No tienes permiso para eliminar proyectos." };

  try {
    await prisma.project.update({
      where: { id, clienteId },
      data: { deletedAt: new Date() },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar el proyecto." };
  }
}

export async function asignarPersonalAction(
  projectId: string,
  clienteId: string,
  employeeIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("proyectos");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para asignar personal." };

  const proyecto = await prisma.project.findFirst({ where: { id: projectId, clienteId } });
  if (!proyecto) return { ok: false, error: "Proyecto no encontrado." };

  try {
    for (const employeeId of employeeIds) {
      await prisma.projectAssignment.upsert({
        where: { projectId_employeeId: { projectId, employeeId } },
        update: { removedAt: null },
        create: { projectId, employeeId },
      });
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al asignar personal." };
  }
}

export async function quitarAsignacionAction(
  assignmentId: string,
  clienteId: string
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("proyectos");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para modificar asignaciones." };

  const asignacion = await prisma.projectAssignment.findFirst({
    where: { id: assignmentId, project: { clienteId } },
  });
  if (!asignacion) return { ok: false, error: "Asignación no encontrada." };

  await prisma.projectAssignment.update({
    where: { id: assignmentId },
    data: { removedAt: new Date() },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
