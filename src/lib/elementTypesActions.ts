"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getPermisoModulo } from "./permisos";
import type { ElementTypeDTO, ElementTypeFormInput } from "./elementTypesTypes";

function aDTO(t: {
  id: string;
  code: string;
  name: string;
  family: string;
  material: string | null;
  lengthM: Prisma.Decimal | null;
  weightUnit: string;
  weightValue: Prisma.Decimal;
  priceUnit: string;
  estimatedPrice: Prisma.Decimal;
  active: boolean;
}): ElementTypeDTO {
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    family: t.family,
    material: t.material,
    lengthM: t.lengthM?.toNumber() ?? null,
    weightUnit: t.weightUnit,
    weightValue: t.weightValue.toNumber(),
    priceUnit: t.priceUnit,
    estimatedPrice: t.estimatedPrice.toNumber(),
    active: t.active,
  };
}

function validarElementType(datos: ElementTypeFormInput): string | null {
  if (!datos.code.trim()) return "El código es requerido.";
  if (!datos.name.trim()) return "El nombre es requerido.";
  if (!datos.family.trim()) return "La familia es requerida.";
  if (!Number.isFinite(datos.weightValue) || datos.weightValue <= 0) {
    return "El peso debe ser mayor a 0.";
  }
  if (!Number.isFinite(datos.estimatedPrice) || datos.estimatedPrice < 0) {
    return "El precio estimado no puede ser negativo.";
  }
  return null;
}

function datosPrisma(datos: ElementTypeFormInput) {
  return {
    code: datos.code.trim(),
    name: datos.name.trim(),
    family: datos.family.trim(),
    description: datos.description?.trim() || null,
    material: datos.material?.trim() || null,
    section: datos.section?.trim() || null,
    lengthM: datos.lengthM,
    widthMm: datos.widthMm,
    heightMm: datos.heightMm,
    thicknessMm: datos.thicknessMm,
    diameterMm: datos.diameterMm,
    weightUnit: datos.weightUnit,
    weightValue: datos.weightValue,
    priceUnit: datos.priceUnit,
    estimatedPrice: datos.estimatedPrice,
    paintAreaM2: datos.paintAreaM2,
    notes: datos.notes?.trim() || null,
    active: datos.active,
  };
}

export async function crearElementTypeAction(
  clienteId: string,
  datos: ElementTypeFormInput
): Promise<{ ok: boolean; error?: string; elementType?: ElementTypeDTO }> {
  const permiso = await getPermisoModulo("elementos");
  if (!permiso.crear) return { ok: false, error: "No tienes permiso para crear elementos." };

  const error = validarElementType(datos);
  if (error) return { ok: false, error };

  try {
    const creado = await prisma.elementType.create({
      data: { clienteId, ...datosPrisma(datos) },
    });
    revalidatePath("/", "layout");
    return { ok: true, elementType: aDTO(creado) };
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe un elemento con ese código." };
    }
    return { ok: false, error: "Error al crear el elemento." };
  }
}

export async function actualizarElementTypeAction(
  id: string,
  clienteId: string,
  datos: ElementTypeFormInput
): Promise<{ ok: boolean; error?: string; elementType?: ElementTypeDTO }> {
  const permiso = await getPermisoModulo("elementos");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para editar elementos." };

  const error = validarElementType(datos);
  if (error) return { ok: false, error };

  try {
    const actualizado = await prisma.elementType.update({
      where: { id, clienteId },
      data: datosPrisma(datos),
    });
    revalidatePath("/", "layout");
    return { ok: true, elementType: aDTO(actualizado) };
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe un elemento con ese código." };
    }
    return { ok: false, error: "Error al actualizar el elemento." };
  }
}

export async function toggleActivoElementTypeAction(
  id: string,
  clienteId: string,
  active: boolean
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("elementos");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para editar elementos." };

  await prisma.elementType.update({ where: { id, clienteId }, data: { active } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function eliminarElementTypeAction(
  id: string,
  clienteId: string
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("elementos");
  if (!permiso.eliminar) return { ok: false, error: "No tienes permiso para eliminar elementos." };

  try {
    await prisma.elementType.update({
      where: { id, clienteId },
      data: { deletedAt: new Date() },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar el elemento." };
  }
}
