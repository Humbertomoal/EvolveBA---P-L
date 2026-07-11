import { prisma } from "./prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

type SeedEmpleado = { nombre: string; role: string; hourlyCost: number };

const EMPLEADOS: SeedEmpleado[] = [
  { nombre: "Juan Pérez", role: "Peón", hourlyCost: 65 },
  { nombre: "Miguel Hernández", role: "Albañil", hourlyCost: 95 },
  { nombre: "Roberto García", role: "Oficial", hourlyCost: 130 },
];

async function ensureEmpleado(clienteId: string, datos: SeedEmpleado) {
  const existe = await db.employee.findFirst({
    where: { clienteId, name: datos.nombre },
  });
  if (existe) return existe;
  return db.employee.create({
    data: {
      clienteId,
      name: datos.nombre,
      role: datos.role,
      hourlyCost: datos.hourlyCost,
      active: true,
    },
  });
}

export async function ensureProyectosSeed(clienteId = "default") {
  for (const empleado of EMPLEADOS) {
    await ensureEmpleado(clienteId, empleado);
  }

  await db.project.upsert({
    where: { clienteId_code: { clienteId, code: "PRY-001" } },
    update: {},
    create: {
      clienteId,
      code: "PRY-001",
      name: "Residencial Las Lomas - Etapa 1",
      clientName: "Grupo Inmobiliario Lomas",
      contractAmount: 4500000,
      advanceAmount: 900000,
      retentionPct: 5,
      startDate: new Date("2026-03-01"),
      status: "EN_CURSO",
    },
  });
}
