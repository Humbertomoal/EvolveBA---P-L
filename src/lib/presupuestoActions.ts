"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getPermisoModulo } from "./permisos";
import { validarLinea, validarPartida, type LineaFormInput, type PartidaFormInput } from "./presupuestoTypes";

type TxClient = Prisma.TransactionClient;

// Crea o refresca la línea "2.1 Materia prima" de una partida a partir de sus
// elementos vigentes (regla #14). Se llama después de asignar/reasignar un
// elemento. Si la partida no tiene elementos y la línea no existe, no hace
// nada — la línea nace la primera vez que hay algo que calcular. El valor
// mostrado en pantalla SIEMPRE se recalcula en vivo en getPresupuestoProyecto;
// esto solo mantiene la fila (y su `amount` de respaldo) al día.
async function asegurarLineaMateriaPrima(tx: TxClient, clienteId: string, partidaId: string) {
  const partida = await tx.budgetItem.findUnique({ where: { id: partidaId } });
  if (!partida || partida.parentId !== null) return; // solo aplica a partidas (nodo raíz)

  const cuenta21 = await tx.costAccount.findFirst({ where: { clienteId, code: "2.1" } });
  if (!cuenta21) return;

  const suma = await tx.element.aggregate({
    where: { budgetItemId: partidaId, deletedAt: null },
    _sum: { totalCost: true },
  });
  const total = suma._sum.totalCost?.toNumber() ?? 0;

  const existente = await tx.budgetItem.findFirst({ where: { parentId: partidaId, accountId: cuenta21.id } });
  if (existente) {
    await tx.budgetItem.update({ where: { id: existente.id }, data: { amount: total } });
  } else if (total > 0) {
    await tx.budgetItem.create({
      data: {
        projectId: partida.projectId,
        parentId: partidaId,
        accountId: cuenta21.id,
        code: `${partida.code}.${cuenta21.code}`,
        name: cuenta21.name,
        amount: total,
        isCalculated: true,
        qty: null,
        unitPrice: null,
        order: -1, // Materia prima siempre primero dentro de la partida
      },
    });
  }
}

export async function crearPartidaAction(
  projectId: string,
  clienteId: string,
  datos: PartidaFormInput
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("presupuestos");
  if (!permiso.crear) return { ok: false, error: "No tienes permiso para crear partidas." };

  const error = validarPartida(datos);
  if (error) return { ok: false, error };

  try {
    await prisma.budgetItem.create({
      data: {
        projectId,
        parentId: null,
        accountId: null,
        code: datos.code.trim(),
        name: datos.name.trim(),
        order: datos.order,
        amount: 0,
        qty: null,
        unitPrice: null,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe una partida con ese código en este proyecto." };
    }
    return { ok: false, error: "Error al crear la partida." };
  }
}

export async function actualizarPartidaAction(
  id: string,
  clienteId: string,
  datos: PartidaFormInput
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("presupuestos");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para editar partidas." };

  const error = validarPartida(datos);
  if (error) return { ok: false, error };

  try {
    await prisma.budgetItem.update({
      where: { id },
      data: { code: datos.code.trim(), name: datos.name.trim(), order: datos.order },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe una partida con ese código en este proyecto." };
    }
    return { ok: false, error: "Error al actualizar la partida." };
  }
}

export async function eliminarPartidaAction(id: string, clienteId: string): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("presupuestos");
  if (!permiso.eliminar) return { ok: false, error: "No tienes permiso para eliminar partidas." };

  const partida = await prisma.budgetItem.findFirst({ where: { id, project: { clienteId } } });
  if (!partida) return { ok: false, error: "La partida no existe." };

  const elementosAsignados = await prisma.element.count({ where: { budgetItemId: id, deletedAt: null } });
  if (elementosAsignados > 0) {
    return { ok: false, error: "No puedes eliminar una partida con elementos asignados." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.budgetItem.deleteMany({ where: { parentId: id } });
      await tx.budgetItem.delete({ where: { id } });
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar la partida." };
  }
}

export async function crearLineaAction(
  partidaId: string,
  clienteId: string,
  datos: LineaFormInput
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("presupuestos");
  if (!permiso.crear) return { ok: false, error: "No tienes permiso para agregar líneas." };

  const error = validarLinea(datos);
  if (error) return { ok: false, error };

  const [partida, cuenta] = await Promise.all([
    prisma.budgetItem.findFirst({ where: { id: partidaId, project: { clienteId } } }),
    prisma.costAccount.findFirst({ where: { id: datos.accountId, clienteId } }),
  ]);
  if (!partida || partida.parentId !== null) return { ok: false, error: "La partida no existe." };
  if (!cuenta) return { ok: false, error: "La cuenta seleccionada no existe." };
  if (cuenta.code === "2.1") {
    return { ok: false, error: "Materia prima se calcula sola desde los elementos, no se agrega a mano." };
  }

  const yaExiste = await prisma.budgetItem.findFirst({ where: { parentId: partidaId, accountId: cuenta.id } });
  if (yaExiste) return { ok: false, error: "Esa cuenta ya tiene una línea en esta partida." };

  try {
    await prisma.budgetItem.create({
      data: {
        projectId: partida.projectId,
        parentId: partidaId,
        accountId: cuenta.id,
        code: `${partida.code}.${cuenta.code}`,
        name: cuenta.name,
        qty: datos.qty,
        unitPrice: datos.unitPrice,
        amount: datos.qty * datos.unitPrice,
        isCalculated: false,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe una línea con ese código en este proyecto." };
    }
    return { ok: false, error: "Error al crear la línea." };
  }
}

export async function actualizarLineaAction(
  id: string,
  clienteId: string,
  datos: { qty: number; unitPrice: number }
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("presupuestos");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para editar líneas." };

  const linea = await prisma.budgetItem.findFirst({ where: { id, project: { clienteId } } });
  if (!linea) return { ok: false, error: "La línea no existe." };
  if (linea.isCalculated) return { ok: false, error: "Esta línea se calcula sola, no se puede editar." };
  if (!Number.isFinite(datos.qty) || datos.qty <= 0) return { ok: false, error: "La cantidad debe ser mayor a 0." };
  if (!Number.isFinite(datos.unitPrice) || datos.unitPrice < 0) {
    return { ok: false, error: "El precio unitario no puede ser negativo." };
  }

  try {
    await prisma.budgetItem.update({
      where: { id },
      data: { qty: datos.qty, unitPrice: datos.unitPrice, amount: datos.qty * datos.unitPrice },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al actualizar la línea." };
  }
}

export async function eliminarLineaAction(id: string, clienteId: string): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("presupuestos");
  if (!permiso.eliminar) return { ok: false, error: "No tienes permiso para eliminar líneas." };

  const linea = await prisma.budgetItem.findFirst({ where: { id, project: { clienteId } } });
  if (!linea) return { ok: false, error: "La línea no existe." };
  if (linea.isCalculated) {
    return { ok: false, error: "Materia prima se calcula sola desde los elementos, no se elimina a mano." };
  }

  try {
    await prisma.budgetItem.delete({ where: { id } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar la línea." };
  }
}

export async function asignarElementoPartidaAction(
  elementId: string,
  clienteId: string,
  budgetItemId: string | null
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("presupuestos");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para asignar elementos a partidas." };

  const elemento = await prisma.element.findFirst({ where: { id: elementId, project: { clienteId } } });
  if (!elemento) return { ok: false, error: "El elemento no existe." };

  if (budgetItemId) {
    const partida = await prisma.budgetItem.findFirst({ where: { id: budgetItemId, project: { clienteId } } });
    if (!partida || partida.parentId !== null) return { ok: false, error: "La partida no existe." };
  }

  const partidaAnteriorId = elemento.budgetItemId;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.element.update({ where: { id: elementId }, data: { budgetItemId } });
      if (partidaAnteriorId && partidaAnteriorId !== budgetItemId) {
        await asegurarLineaMateriaPrima(tx, clienteId, partidaAnteriorId);
      }
      if (budgetItemId) {
        await asegurarLineaMateriaPrima(tx, clienteId, budgetItemId);
      }
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al asignar el elemento a la partida." };
  }
}
