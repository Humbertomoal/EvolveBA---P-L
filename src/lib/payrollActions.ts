"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getPermisoModulo } from "./permisos";
import { validarPayroll, type PayrollFormInput } from "./payrollTypes";

export async function guardarPayrollPeriodAction(
  clienteId: string,
  datos: PayrollFormInput
): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("costos");
  if (!permiso.crear && !permiso.editar) {
    return { ok: false, error: "No tienes permiso para capturar nómina." };
  }

  const error = validarPayroll(datos);
  if (error) return { ok: false, error };

  try {
    await prisma.payrollPeriod.upsert({
      where: { clienteId_year_month_type: { clienteId, year: datos.year, month: datos.month, type: datos.type } },
      update: { amount: datos.amount, notes: datos.notes?.trim() || null },
      create: {
        clienteId,
        year: datos.year,
        month: datos.month,
        type: datos.type,
        amount: datos.amount,
        notes: datos.notes?.trim() || null,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return { ok: false, error: "Error al guardar la nómina." };
    }
    return { ok: false, error: "Error al guardar la nómina." };
  }
}

export async function eliminarPayrollPeriodAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("costos");
  if (!permiso.eliminar) return { ok: false, error: "No tienes permiso para eliminar nómina." };

  try {
    await prisma.payrollPeriod.delete({ where: { id } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar la nómina." };
  }
}
