import { prisma } from "./prisma";
import type { ComparativoMesDTO, PayrollPeriodDTO, PayrollType } from "./payrollTypes";
import { calcularComparativo } from "./payrollTypes";

export async function getPayrollPeriods(clienteId = "default"): Promise<PayrollPeriodDTO[]> {
  const periodos = await prisma.payrollPeriod.findMany({
    where: { clienteId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return periodos.map((p) => ({
    id: p.id,
    year: p.year,
    month: p.month,
    type: p.type as PayrollType,
    amount: p.amount.toNumber(),
    notes: p.notes,
  }));
}

// MO aplicada de un mes calendario completo (Σ TimeEntry.amount, empresa
// entera). Solo tiene contraparte OPERATIVA — la nómina ADMINISTRATIVA no se
// compara contra TimeEntry (regla #12).
async function getMoAplicadaMes(clienteId: string, year: number, month: number): Promise<number> {
  const desde = new Date(Date.UTC(year, month - 1, 1));
  const hasta = new Date(Date.UTC(year, month, 1));
  const entradas = await prisma.timeEntry.findMany({
    where: { deletedAt: null, date: { gte: desde, lt: hasta }, project: { clienteId } },
    select: { amount: true },
  });
  return entradas.reduce((acc, t) => acc + t.amount.toNumber(), 0);
}

export async function getComparativoNomina(clienteId = "default"): Promise<ComparativoMesDTO[]> {
  const operativas = await prisma.payrollPeriod.findMany({
    where: { clienteId, type: "OPERATIVA" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return Promise.all(
    operativas.map(async (p) => {
      const moAplicada = await getMoAplicadaMes(clienteId, p.year, p.month);
      const nominaReal = p.amount.toNumber();
      const { ociosidad, ociosidadPct } = calcularComparativo(nominaReal, moAplicada);
      return { year: p.year, month: p.month, nominaReal, moAplicada, ociosidad, ociosidadPct };
    })
  );
}
