import { prisma } from "./prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

type SeedEtapa = { codigo: string; nombre: string; weightPct: number; order: number };

// Los weightPct deben sumar exactamente 100 (regla #7).
const ETAPAS: SeedEtapa[] = [
  { codigo: "HABILITADO", nombre: "Habilitado", weightPct: 15, order: 1 },
  { codigo: "FABRICADO", nombre: "Fabricado", weightPct: 45, order: 2 },
  { codigo: "EN_SITIO", nombre: "En sitio", weightPct: 10, order: 3 },
  { codigo: "MONTADO", nombre: "Montado", weightPct: 30, order: 4 },
];

export async function ensureElementStagesSeed(clienteId = "default") {
  for (const etapa of ETAPAS) {
    await db.elementStage.upsert({
      where: { clienteId_code: { clienteId, code: etapa.codigo } },
      update: {},
      create: {
        clienteId,
        code: etapa.codigo,
        name: etapa.nombre,
        weightPct: etapa.weightPct,
        order: etapa.order,
      },
    });
  }
}
