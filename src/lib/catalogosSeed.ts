import { prisma } from "./prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

type SeedValor = { codigo: string; nombre: string; orden: number; simbolo?: string };

// CostCategory NO va aquí: es un enum de Prisma, fuente de verdad única.
// CatalogoValor solo cubre lo configurable por cliente.
const SEED: Record<string, SeedValor[]> = {
  UNIDAD_MEDIDA: [
    { codigo: "M3", nombre: "Metro cúbico", orden: 1 },
    { codigo: "M2", nombre: "Metro cuadrado", orden: 2 },
    { codigo: "ML", nombre: "Metro lineal", orden: 3 },
    { codigo: "TON", nombre: "Tonelada", orden: 4 },
    { codigo: "KG", nombre: "Kilogramo", orden: 5 },
    { codigo: "PZA", nombre: "Pieza", orden: 6 },
    { codigo: "JORNAL", nombre: "Jornal", orden: 7 },
    { codigo: "LOTE", nombre: "Lote", orden: 8 },
  ],
  ROL_EMPLEADO: [
    { codigo: "PEON", nombre: "Peón", orden: 1 },
    { codigo: "ALBANIL", nombre: "Albañil", orden: 2 },
    { codigo: "OFICIAL", nombre: "Oficial", orden: 3 },
    { codigo: "CABO", nombre: "Cabo", orden: 4 },
    { codigo: "MAESTRO_OBRA", nombre: "Maestro de obra", orden: 5 },
    { codigo: "RESIDENTE", nombre: "Residente", orden: 6 },
  ],
  TIPO_PROYECTO: [
    { codigo: "OBRA_CIVIL", nombre: "Obra civil", orden: 1 },
    { codigo: "REMODELACION", nombre: "Remodelación", orden: 2 },
    { codigo: "INSTALACIONES", nombre: "Instalaciones", orden: 3 },
    { codigo: "URBANIZACION", nombre: "Urbanización", orden: 4 },
  ],
};

export async function ensureCatalogosSeed(clienteId = "default") {
  for (const [tipo, valores] of Object.entries(SEED)) {
    for (const v of valores) {
      await db.catalogoValor.upsert({
        where: { tipo_codigo_clienteId: { tipo, codigo: v.codigo, clienteId } },
        update: {},
        create: {
          tipo,
          codigo: v.codigo,
          nombre: v.nombre,
          orden: v.orden,
          simbolo: v.simbolo ?? null,
          clienteId,
        },
      });
    }
  }
}
