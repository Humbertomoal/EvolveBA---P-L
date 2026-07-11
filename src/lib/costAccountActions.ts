"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getPermisoModulo } from "./permisos";
import type { CostAccountDTO, CostAccountFormInput } from "./costAccountTypes";

function aDTO(c: {
  id: string;
  code: string;
  name: string;
  level: number;
  parentId: string | null;
  order: number;
  isProject: boolean;
  isSystem: boolean;
  active: boolean;
}): CostAccountDTO {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    level: c.level,
    parentId: c.parentId,
    order: c.order,
    isProject: c.isProject,
    isSystem: c.isSystem,
    active: c.active,
  };
}

function validar(datos: CostAccountFormInput): string | null {
  if (!datos.code.trim()) return "El código es requerido.";
  if (!datos.name.trim()) return "El nombre es requerido.";
  if (![2, 3, 4, 5].includes(datos.level)) return "El nivel debe ser 2, 3, 4 o 5.";
  return null;
}

export async function crearCostAccountAction(
  clienteId: string,
  datos: CostAccountFormInput
): Promise<{ ok: boolean; error?: string; cuenta?: CostAccountDTO }> {
  const permiso = await getPermisoModulo("configuracion");
  if (!permiso.crear) return { ok: false, error: "No tienes permiso para crear cuentas." };

  const error = validar(datos);
  if (error) return { ok: false, error };

  try {
    const creada = await prisma.costAccount.create({
      data: {
        clienteId,
        code: datos.code.trim(),
        name: datos.name.trim(),
        level: datos.level,
        parentId: datos.parentId,
        order: datos.order,
        isProject: datos.isProject,
        active: datos.active,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true, cuenta: aDTO(creada) };
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe una cuenta con ese código." };
    }
    return { ok: false, error: "Error al crear la cuenta." };
  }
}

export async function actualizarCostAccountAction(
  id: string,
  clienteId: string,
  datos: CostAccountFormInput
): Promise<{ ok: boolean; error?: string; cuenta?: CostAccountDTO }> {
  const permiso = await getPermisoModulo("configuracion");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para editar cuentas." };

  const existente = await prisma.costAccount.findUnique({ where: { id, clienteId } });
  if (!existente) return { ok: false, error: "La cuenta no existe." };
  if (existente.isSystem) {
    return { ok: false, error: "Esta cuenta se calcula automáticamente y no se puede editar." };
  }

  const error = validar(datos);
  if (error) return { ok: false, error };

  try {
    const actualizada = await prisma.costAccount.update({
      where: { id, clienteId },
      data: {
        code: datos.code.trim(),
        name: datos.name.trim(),
        level: datos.level,
        parentId: datos.parentId,
        order: datos.order,
        isProject: datos.isProject,
        active: datos.active,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true, cuenta: aDTO(actualizada) };
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe una cuenta con ese código." };
    }
    return { ok: false, error: "Error al actualizar la cuenta." };
  }
}

export async function eliminarCostAccountAction(
  id: string,
  clienteId: string
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("configuracion");
  if (!permiso.eliminar) return { ok: false, error: "No tienes permiso para eliminar cuentas." };

  const existente = await prisma.costAccount.findUnique({
    where: { id, clienteId },
    include: { children: { where: { deletedAt: null } } },
  });
  if (!existente) return { ok: false, error: "La cuenta no existe." };
  if (existente.isSystem) {
    return { ok: false, error: "Esta cuenta se calcula automáticamente y no se puede eliminar." };
  }
  if (existente.children.length > 0) {
    return { ok: false, error: "No puedes eliminar una cuenta que tiene subcuentas." };
  }

  try {
    await prisma.costAccount.update({ where: { id, clienteId }, data: { deletedAt: new Date() } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar la cuenta." };
  }
}
