"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getPermisoModulo } from "./permisos";
import { calcularPesoUnitario } from "./elementTypesTypes";
import type { ElementoProyectoFormInput, ProyectoFormInput } from "./proyectosTypes";

type TxClient = Prisma.TransactionClient;

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

// Chequeos que no requieren la BD (código duplicado dentro del propio envío,
// campos numéricos básicos). Lo que depende del ElementType (largo obligatorio
// si KG_M, peso > 0) se valida dentro de la transacción, donde ya lo tenemos.
function validarElementosProyecto(elementos: ElementoProyectoFormInput[]): string | null {
  const codigos = new Set<string>();
  for (const el of elementos) {
    const code = el.code.trim();
    if (!code) return "Todos los elementos necesitan un código de obra.";
    if (codigos.has(code.toLowerCase())) return `Código de elemento duplicado: "${code}".`;
    codigos.add(code.toLowerCase());
    if (!Number.isInteger(el.qty) || el.qty < 1) {
      return `La cantidad de "${code}" debe ser un entero mayor o igual a 1.`;
    }
    if (!Number.isFinite(el.unitCost) || el.unitCost < 0) {
      return `El costo unitario de "${code}" no puede ser negativo.`;
    }
  }
  return null;
}

// Deja el estado de ProjectAssignment activo del proyecto igual al conjunto
// `employeeIds` recibido: crea/reactiva los que faltan, pone removedAt a los que
// sobran. Nunca borra filas (se conserva el historial). Compartido entre
// actualizarProyectoAction y sincronizarAsignacionesAction para no duplicar el
// diff en dos lugares.
async function syncAssignments(tx: TxClient, projectId: string, employeeIds: string[]) {
  const deseadosIds = new Set(employeeIds);

  const activos = await tx.projectAssignment.findMany({
    where: { projectId, removedAt: null },
    select: { id: true, employeeId: true },
  });
  const activosIds = new Set(activos.map((a) => a.employeeId));

  for (const employeeId of deseadosIds) {
    if (!activosIds.has(employeeId)) {
      await tx.projectAssignment.upsert({
        where: { projectId_employeeId: { projectId, employeeId } },
        update: { removedAt: null },
        create: { projectId, employeeId },
      });
    }
  }

  for (const asignacion of activos) {
    if (!deseadosIds.has(asignacion.employeeId)) {
      await tx.projectAssignment.update({
        where: { id: asignacion.id },
        data: { removedAt: new Date() },
      });
    }
  }
}

// Crea o actualiza un Element a partir de un renglón del formulario, tomando
// SNAPSHOT del ElementType vigente (regla #10 — nunca lee el catálogo en vivo
// después de guardado). Lanza Error (aborta la transacción) si algo no cuadra.
async function guardarElementoSnapshot(
  tx: TxClient,
  clienteId: string,
  projectId: string,
  fila: ElementoProyectoFormInput
) {
  const code = fila.code.trim();
  const elementType = await tx.elementType.findFirst({
    where: { id: fila.elementTypeId, clienteId },
  });
  if (!elementType) {
    throw new Error(`El tipo de elemento de "${code}" ya no existe en el catálogo.`);
  }

  if (elementType.weightUnit === "KG_M" && (!fila.length || fila.length <= 0)) {
    throw new Error(`"${code}" (${elementType.name}) requiere un largo mayor a 0.`);
  }

  const pesoUnitario = calcularPesoUnitario(elementType.weightUnit, elementType.weightValue.toNumber(), fila.length);
  if (pesoUnitario <= 0) {
    throw new Error(`El peso resultante de "${code}" debe ser mayor a 0.`);
  }

  const data = {
    code,
    name: elementType.name,
    type: elementType.family,
    material: elementType.material,
    elementTypeId: elementType.id,
    length: fila.length,
    weight: pesoUnitario,
    qty: fila.qty,
    unitCost: fila.unitCost,
    totalCost: fila.unitCost * fila.qty,
  };

  if (fila.id) {
    await tx.element.update({ where: { id: fila.id }, data });
  } else {
    await tx.element.create({ data: { projectId, ...data } });
  }
}

// Deja los Element activos del proyecto iguales al conjunto `filas` recibido:
// crea/actualiza los que vienen, hace soft delete de los que ya no están.
// Bloquea (lanza Error) si un elemento a quitar tiene horas o costos
// registrados — nunca se borra ni se pierde ese historial.
async function syncElementos(
  tx: TxClient,
  clienteId: string,
  projectId: string,
  filas: ElementoProyectoFormInput[]
) {
  const existentes = await tx.element.findMany({
    where: { projectId, deletedAt: null },
    include: { _count: { select: { timeEntries: true, costs: true } } },
  });
  const filasConId = new Set(filas.filter((f) => f.id).map((f) => f.id));

  for (const ex of existentes) {
    if (!filasConId.has(ex.id)) {
      if (ex._count.timeEntries > 0 || ex._count.costs > 0) {
        throw new Error(`No se puede quitar "${ex.code}": tiene horas o costos registrados.`);
      }
      await tx.element.update({ where: { id: ex.id }, data: { deletedAt: new Date() } });
    }
  }

  for (const fila of filas) {
    await guardarElementoSnapshot(tx, clienteId, projectId, fila);
  }
}

export async function crearProyectoAction(
  clienteId: string,
  datos: ProyectoFormInput
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("proyectos");
  if (!permiso.crear) return { ok: false, error: "No tienes permiso para crear proyectos." };

  const error = validarProyecto(datos) ?? validarElementosProyecto(datos.elementos);
  if (error) return { ok: false, error };

  const employeeIds = Array.from(new Set(datos.employeeIds));

  try {
    await prisma.$transaction(async (tx) => {
      const proyecto = await tx.project.create({
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
      for (const employeeId of employeeIds) {
        await tx.projectAssignment.create({ data: { projectId: proyecto.id, employeeId } });
      }
      for (const fila of datos.elementos) {
        await guardarElementoSnapshot(tx, clienteId, proyecto.id, fila);
      }
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe un proyecto (o un código de elemento) duplicado." };
    }
    if (e instanceof Error) {
      return { ok: false, error: e.message };
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

  const error = validarProyecto(datos) ?? validarElementosProyecto(datos.elementos);
  if (error) return { ok: false, error };

  const employeeIds = Array.from(new Set(datos.employeeIds));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.project.update({
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
      await syncAssignments(tx, id, employeeIds);
      await syncElementos(tx, clienteId, id, datos.elementos);
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe un proyecto (o un código de elemento) duplicado." };
    }
    if (e instanceof Error) {
      return { ok: false, error: e.message };
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

// Usado por el tab Personal del detalle (gestión rápida vía el mismo modal
// selector que el formulario). No toca los campos del proyecto, solo sincroniza
// las asignaciones activas contra la selección recibida.
export async function sincronizarAsignacionesAction(
  projectId: string,
  clienteId: string,
  employeeIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("proyectos");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para asignar personal." };

  const proyecto = await prisma.project.findFirst({ where: { id: projectId, clienteId } });
  if (!proyecto) return { ok: false, error: "Proyecto no encontrado." };

  try {
    await prisma.$transaction(async (tx) => {
      await syncAssignments(tx, projectId, Array.from(new Set(employeeIds)));
    });
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
