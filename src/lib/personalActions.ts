"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// ── Tipos ──────────────────────────────────────────────────────────────────────

type EmpleadoInput = {
  code?: string | null;
  name: string;
  role?: string | null;
  hourlyCost: number;
  isLeader?: boolean;
  crewId?: string | null;
  active?: boolean;
};

type CuadrillaInput = {
  name: string;
  leaderId: string;
  active?: boolean;
};

// ── Empleados ──────────────────────────────────────────────────────────────────

export async function crearEmpleadoAction(
  clienteId: string,
  datos: EmpleadoInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.employee.create({
      data: {
        clienteId,
        code: datos.code?.trim() || null,
        name: datos.name.trim(),
        role: datos.role?.trim() || null,
        hourlyCost: datos.hourlyCost,
        isLeader: datos.isLeader ?? false,
        crewId: datos.crewId || null,
        active: datos.active ?? true,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al crear el empleado." };
  }
}

export async function actualizarEmpleadoAction(
  id: string,
  datos: Partial<EmpleadoInput>
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.employee.update({
      where: { id },
      data: {
        ...(datos.code !== undefined ? { code: datos.code?.trim() || null } : {}),
        ...(datos.name !== undefined ? { name: datos.name.trim() } : {}),
        ...(datos.role !== undefined ? { role: datos.role?.trim() || null } : {}),
        ...(datos.hourlyCost !== undefined ? { hourlyCost: datos.hourlyCost } : {}),
        ...(datos.isLeader !== undefined ? { isLeader: datos.isLeader } : {}),
        ...(datos.crewId !== undefined ? { crewId: datos.crewId || null } : {}),
        ...(datos.active !== undefined ? { active: datos.active } : {}),
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al actualizar el empleado." };
  }
}

export async function toggleActivoEmpleadoAction(id: string, active: boolean): Promise<{ ok: boolean }> {
  await db.employee.update({ where: { id }, data: { active } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function eliminarEmpleadoAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const liderando = await db.crew.findUnique({ where: { leaderId: id } });
  if (liderando) {
    return {
      ok: false,
      error: `No se puede eliminar: lidera la cuadrilla "${liderando.name}". Asigna otro jefe primero.`,
    };
  }
  await db.employee.update({ where: { id }, data: { deletedAt: new Date(), crewId: null } });
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Cuadrillas ─────────────────────────────────────────────────────────────────

export async function crearCuadrillaAction(
  clienteId: string,
  datos: CuadrillaInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.crew.create({
      data: {
        clienteId,
        name: datos.name.trim(),
        leaderId: datos.leaderId,
        active: datos.active ?? true,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((e as any)?.code === "P2002") {
      return { ok: false, error: "Ese empleado ya lidera otra cuadrilla." };
    }
    return { ok: false, error: "Error al crear la cuadrilla." };
  }
}

export async function actualizarCuadrillaAction(
  id: string,
  datos: Partial<CuadrillaInput>
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.crew.update({
      where: { id },
      data: {
        ...(datos.name !== undefined ? { name: datos.name.trim() } : {}),
        ...(datos.leaderId !== undefined ? { leaderId: datos.leaderId } : {}),
        ...(datos.active !== undefined ? { active: datos.active } : {}),
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((e as any)?.code === "P2002") {
      return { ok: false, error: "Ese empleado ya lidera otra cuadrilla." };
    }
    return { ok: false, error: "Error al actualizar la cuadrilla." };
  }
}

export async function toggleActivaCuadrillaAction(id: string, active: boolean): Promise<{ ok: boolean }> {
  await db.crew.update({ where: { id }, data: { active } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function eliminarCuadrillaAction(id: string): Promise<{ ok: boolean }> {
  await db.employee.updateMany({ where: { crewId: id }, data: { crewId: null } });
  await db.crew.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Integrantes ────────────────────────────────────────────────────────────────

export async function agregarIntegranteAction(
  crewId: string,
  employeeId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.employee.update({ where: { id: employeeId }, data: { crewId } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al agregar el integrante." };
  }
}

export async function quitarIntegranteAction(employeeId: string): Promise<{ ok: boolean }> {
  await db.employee.update({ where: { id: employeeId }, data: { crewId: null } });
  revalidatePath("/", "layout");
  return { ok: true };
}
