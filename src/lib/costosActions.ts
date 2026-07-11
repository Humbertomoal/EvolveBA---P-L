"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getPermisoModulo } from "./permisos";
import { validarCosto, type CostoFormInput } from "./costosTypes";

async function obtenerCuentaParaValidar(accountId: string, clienteId: string) {
  const cuenta = await prisma.costAccount.findUnique({
    where: { id: accountId },
    select: { clienteId: true, isProject: true, isSystem: true },
  });
  if (!cuenta || cuenta.clienteId !== clienteId) return undefined;
  return cuenta;
}

export async function crearCostoAction(
  clienteId: string,
  datos: CostoFormInput
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("costos");
  if (!permiso.crear) return { ok: false, error: "No tienes permiso para capturar costos." };

  const cuenta = await obtenerCuentaParaValidar(datos.accountId, clienteId);
  const error = validarCosto(datos, cuenta);
  if (error) return { ok: false, error };

  try {
    await prisma.cost.create({
      data: {
        accountId: datos.accountId,
        projectId: datos.projectId,
        elementId: datos.elementId,
        date: new Date(datos.date),
        supplierName: datos.supplierName?.trim() || null,
        description: datos.description.trim(),
        invoiceRef: datos.invoiceRef?.trim() || null,
        amount: datos.amount,
        paidAt: datos.paidAt ? new Date(datos.paidAt) : null,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al crear el costo." };
  }
}

export async function actualizarCostoAction(
  id: string,
  clienteId: string,
  datos: CostoFormInput
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("costos");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para editar costos." };

  const cuenta = await obtenerCuentaParaValidar(datos.accountId, clienteId);
  const error = validarCosto(datos, cuenta);
  if (error) return { ok: false, error };

  try {
    await prisma.cost.update({
      where: { id },
      data: {
        accountId: datos.accountId,
        projectId: datos.projectId,
        elementId: datos.elementId,
        date: new Date(datos.date),
        supplierName: datos.supplierName?.trim() || null,
        description: datos.description.trim(),
        invoiceRef: datos.invoiceRef?.trim() || null,
        amount: datos.amount,
        paidAt: datos.paidAt ? new Date(datos.paidAt) : null,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al actualizar el costo." };
  }
}

export async function eliminarCostoAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("costos");
  if (!permiso.eliminar) return { ok: false, error: "No tienes permiso para eliminar costos." };

  try {
    await prisma.cost.update({ where: { id }, data: { deletedAt: new Date() } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar el costo." };
  }
}
