"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getPermisoModulo } from "./permisos";
import { calcularAvancePct } from "./avanceProyecto";
import { getUltimaEstimacionAceptada } from "./getEstimaciones";
import {
  calcularAmortizacion,
  calcularBruto,
  calcularNeto,
  calcularRetencion,
  periodosTraslapan,
  validarAvanceNoNegativo,
  validarPeriodo,
  ESTATUS_INGRESO,
  type EstimacionFormInput,
  type EstimacionPreviewDTO,
} from "./estimacionesTypes";

type TxClient = Prisma.TransactionClient | typeof prisma;

// Pipeline único de cálculo — lo usan tanto el preview en vivo (sin escribir
// nada) como crear/actualizar (autoritativo, dentro de una transacción).
// Nunca confía en avance/periodo mandados por el cliente: todo se recalcula
// aquí desde el estado vigente de BD (regla de la fase: "el avance NO se
// teclea, se arma solo").
async function calcularEstimacion(
  db: TxClient,
  projectId: string,
  periodStart: string,
  periodEnd: string,
  grossAmountOverride: number | null,
  estimateIdExcluir?: string
): Promise<{ ok: true; data: EstimacionPreviewDTO } | { ok: false; error: string }> {
  const errorPeriodo = validarPeriodo(periodStart, periodEnd);
  if (errorPeriodo) return { ok: false, error: errorPeriodo };

  const proyecto = await db.project.findUnique({
    where: { id: projectId },
    select: { contractAmount: true, advanceAmount: true, retentionPct: true },
  });
  if (!proyecto) return { ok: false, error: "El proyecto no existe." };

  const contractAmount = proyecto.contractAmount.toNumber();
  const advanceAmount = proyecto.advanceAmount.toNumber();
  const retentionPct = proyecto.retentionPct.toNumber();

  const [avanceAcumulado, ultimaAceptada, aceptadas, otras] = await Promise.all([
    calcularAvancePct(projectId),
    getUltimaEstimacionAceptada(projectId, db),
    db.estimate.findMany({
      where: { projectId, deletedAt: null, status: { in: ESTATUS_INGRESO }, id: { not: estimateIdExcluir } },
      select: { advanceAmort: true },
    }),
    db.estimate.findMany({
      where: { projectId, deletedAt: null, id: { not: estimateIdExcluir } },
      select: { id: true, periodStart: true, periodEnd: true, grossAmount: true },
    }),
  ]);

  const avanceAnterior = ultimaAceptada ? ultimaAceptada.progressPct.toNumber() : 0;
  const periodoPct = Math.round((avanceAcumulado - avanceAnterior) * 100) / 100;

  const errorAvance = validarAvanceNoNegativo(avanceAcumulado, avanceAnterior);
  if (errorAvance) return { ok: false, error: errorAvance };

  const nuevoStart = new Date(periodStart);
  const nuevoEnd = new Date(periodEnd);
  for (const o of otras) {
    if (periodosTraslapan(nuevoStart, nuevoEnd, o.periodStart, o.periodEnd)) {
      return { ok: false, error: "El periodo se traslapa con otra estimación ya existente." };
    }
  }

  const bruto = calcularBruto(periodoPct, contractAmount, grossAmountOverride);
  const retencion = calcularRetencion(bruto, retentionPct);
  const amortizadoAcumulado = aceptadas.reduce((acc, e) => acc + e.advanceAmort.toNumber(), 0);
  const saldoAnticipoDisponible = advanceAmount - amortizadoAcumulado;
  const amortizacion = calcularAmortizacion(bruto, advanceAmount, contractAmount, saldoAnticipoDisponible);
  const neto = calcularNeto(bruto, retencion, amortizacion);

  return {
    ok: true,
    data: {
      progressPct: avanceAcumulado,
      avanceAnterior,
      periodoPct,
      grossAmount: bruto,
      grossAmountManual: grossAmountOverride !== null,
      retention: retencion,
      advanceAmort: amortizacion,
      netAmount: neto,
      saldoAnticipoDisponible,
    },
  };
}

// Advertencia NO bloqueante: suma de brutos de todas las estimaciones vigentes
// (incluyendo la que se está guardando) contra el contrato.
async function advertenciaSobreContrato(
  db: TxClient,
  projectId: string,
  bruto: number,
  estimateIdExcluir?: string
): Promise<string | undefined> {
  const [proyecto, otras] = await Promise.all([
    db.project.findUnique({ where: { id: projectId }, select: { contractAmount: true } }),
    db.estimate.findMany({
      where: { projectId, deletedAt: null, id: { not: estimateIdExcluir } },
      select: { grossAmount: true },
    }),
  ]);
  if (!proyecto) return undefined;
  const contractAmount = proyecto.contractAmount.toNumber();
  const sumaBrutos = otras.reduce((acc, e) => acc + e.grossAmount.toNumber(), 0) + bruto;
  if (sumaBrutos > contractAmount) {
    return `La suma de los brutos de todas las estimaciones ($${sumaBrutos.toLocaleString("es-MX")}) excede el monto del contrato ($${contractAmount.toLocaleString("es-MX")}).`;
  }
  return undefined;
}

export async function previsualizarEstimacionAction(
  projectId: string,
  clienteId: string,
  datos: EstimacionFormInput,
  estimateIdExcluir?: string
): Promise<{ ok: boolean; error?: string; data?: EstimacionPreviewDTO }> {
  const permiso = await getPermisoModulo("estimaciones");
  if (!permiso.ver) return { ok: false, error: "No tienes permiso para ver estimaciones." };

  const proyecto = await prisma.project.findFirst({ where: { id: projectId, clienteId } });
  if (!proyecto) return { ok: false, error: "El proyecto no existe." };

  const resultado = await calcularEstimacion(
    prisma,
    projectId,
    datos.periodStart,
    datos.periodEnd,
    datos.grossAmountOverride,
    estimateIdExcluir
  );
  if (!resultado.ok) return { ok: false, error: resultado.error };
  return { ok: true, data: resultado.data };
}

export async function crearEstimacionAction(
  projectId: string,
  clienteId: string,
  datos: EstimacionFormInput
): Promise<{ ok: boolean; error?: string; warning?: string }> {
  const permiso = await getPermisoModulo("estimaciones");
  if (!permiso.crear) return { ok: false, error: "No tienes permiso para crear estimaciones." };

  const proyecto = await prisma.project.findFirst({ where: { id: projectId, clienteId } });
  if (!proyecto) return { ok: false, error: "El proyecto no existe." };

  try {
    let warning: string | undefined;
    await prisma.$transaction(async (tx) => {
      const resultado = await calcularEstimacion(tx, projectId, datos.periodStart, datos.periodEnd, datos.grossAmountOverride);
      if (!resultado.ok) throw new Error(resultado.error);

      const ultimo = await tx.estimate.aggregate({ where: { projectId }, _max: { number: true } });
      const number = (ultimo._max.number ?? 0) + 1;

      warning = await advertenciaSobreContrato(tx, projectId, resultado.data.grossAmount);

      await tx.estimate.create({
        data: {
          projectId,
          number,
          periodStart: new Date(datos.periodStart),
          periodEnd: new Date(datos.periodEnd),
          progressPct: resultado.data.progressPct,
          grossAmount: resultado.data.grossAmount,
          grossAmountManual: resultado.data.grossAmountManual,
          retention: resultado.data.retention,
          advanceAmort: resultado.data.advanceAmort,
          netAmount: resultado.data.netAmount,
          status: "BORRADOR",
        },
      });
    });
    revalidatePath("/", "layout");
    return { ok: true, warning };
  } catch (e: unknown) {
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: "Error al crear la estimación." };
  }
}

export async function actualizarEstimacionAction(
  id: string,
  clienteId: string,
  datos: EstimacionFormInput
): Promise<{ ok: boolean; error?: string; warning?: string }> {
  const permiso = await getPermisoModulo("estimaciones");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para editar estimaciones." };

  const existente = await prisma.estimate.findFirst({ where: { id, project: { clienteId } } });
  if (!existente) return { ok: false, error: "La estimación no existe." };
  if (existente.status !== "BORRADOR") {
    return { ok: false, error: "Solo se puede editar una estimación en Borrador." };
  }

  try {
    let warning: string | undefined;
    await prisma.$transaction(async (tx) => {
      const resultado = await calcularEstimacion(
        tx,
        existente.projectId,
        datos.periodStart,
        datos.periodEnd,
        datos.grossAmountOverride,
        id
      );
      if (!resultado.ok) throw new Error(resultado.error);

      warning = await advertenciaSobreContrato(tx, existente.projectId, resultado.data.grossAmount, id);

      await tx.estimate.update({
        where: { id },
        data: {
          periodStart: new Date(datos.periodStart),
          periodEnd: new Date(datos.periodEnd),
          progressPct: resultado.data.progressPct,
          grossAmount: resultado.data.grossAmount,
          grossAmountManual: resultado.data.grossAmountManual,
          retention: resultado.data.retention,
          advanceAmort: resultado.data.advanceAmort,
          netAmount: resultado.data.netAmount,
        },
      });
    });
    revalidatePath("/", "layout");
    return { ok: true, warning };
  } catch (e: unknown) {
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: "Error al actualizar la estimación." };
  }
}

export async function eliminarEstimacionAction(id: string, clienteId: string): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("estimaciones");
  if (!permiso.eliminar) return { ok: false, error: "No tienes permiso para eliminar estimaciones." };

  const existente = await prisma.estimate.findFirst({ where: { id, project: { clienteId } } });
  if (!existente) return { ok: false, error: "La estimación no existe." };
  if (existente.status !== "BORRADOR") {
    return { ok: false, error: "Solo se puede eliminar una estimación en Borrador." };
  }

  await prisma.estimate.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function enviarEstimacionAction(id: string, clienteId: string): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("estimaciones");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para enviar estimaciones." };

  const existente = await prisma.estimate.findFirst({ where: { id, project: { clienteId } } });
  if (!existente) return { ok: false, error: "La estimación no existe." };
  if (existente.status !== "BORRADOR") return { ok: false, error: "Solo una estimación en Borrador se puede enviar." };

  await prisma.estimate.update({ where: { id }, data: { status: "ENVIADA" } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function autorizarEstimacionAction(id: string, clienteId: string): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("estimaciones");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para autorizar estimaciones." };

  const existente = await prisma.estimate.findFirst({ where: { id, project: { clienteId } } });
  if (!existente) return { ok: false, error: "La estimación no existe." };
  if (existente.status !== "ENVIADA") return { ok: false, error: "Solo una estimación Enviada se puede autorizar." };

  await prisma.estimate.update({ where: { id }, data: { status: "AUTORIZADA", authorizedAt: new Date() } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function marcarPagadaEstimacionAction(id: string, clienteId: string): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("estimaciones");
  if (!permiso.editar) return { ok: false, error: "No tienes permiso para marcar como pagada una estimación." };

  const existente = await prisma.estimate.findFirst({ where: { id, project: { clienteId } } });
  if (!existente) return { ok: false, error: "La estimación no existe." };
  if (existente.status !== "AUTORIZADA") return { ok: false, error: "Solo una estimación Autorizada se puede marcar como pagada." };

  await prisma.estimate.update({ where: { id }, data: { status: "PAGADA", paidAt: new Date() } });
  revalidatePath("/", "layout");
  return { ok: true };
}

// Regresar a Borrador: solo Administrador (permiso.eliminar, el único
// distintivo de "T" contra "E" en este sistema — ver CLAUDE.md). Limpia los
// sellos de autorización/pago porque dejan de ser válidos.
export async function regresarABorradorAction(id: string, clienteId: string): Promise<{ ok: boolean; error?: string }> {
  const permiso = await getPermisoModulo("estimaciones");
  if (!permiso.eliminar) return { ok: false, error: "Solo un administrador puede regresar una estimación a Borrador." };

  const existente = await prisma.estimate.findFirst({ where: { id, project: { clienteId } } });
  if (!existente) return { ok: false, error: "La estimación no existe." };
  if (existente.status === "BORRADOR") return { ok: false, error: "Esta estimación ya está en Borrador." };

  await prisma.estimate.update({
    where: { id },
    data: { status: "BORRADOR", authorizedAt: null, paidAt: null },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
