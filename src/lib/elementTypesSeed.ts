import { prisma } from "./prisma";

type SeedElementType = {
  code: string;
  name: string;
  family: string;
  material: string;
  section?: string;
  diameterMm?: number;
  thicknessMm?: number;
  weightUnit: string;
  weightValue: number;
  priceUnit: string;
  estimatedPrice: number;
};

const ELEMENT_TYPES: SeedElementType[] = [
  { code: "IPR-12X40", name: "Viga IPR 12x40", family: "Viga", material: "A992", section: "IPR", weightUnit: "KG_M", weightValue: 59.5, priceUnit: "KG", estimatedPrice: 32.5 },
  { code: "IPR-10X33", name: "Viga IPR 10x33", family: "Viga", material: "A992", section: "IPR", weightUnit: "KG_M", weightValue: 49.1, priceUnit: "KG", estimatedPrice: 32.5 },
  { code: "PL-12MM", name: "Placa 1/2\" (12.7mm)", family: "Placa", material: "A36", thicknessMm: 12.7, weightUnit: "KG_PZA", weightValue: 299.5, priceUnit: "KG", estimatedPrice: 30 },
  { code: "HSS-4X4X14", name: "HSS 4x4x1/4", family: "Columna", material: "A500 Gr.B", section: "HSS", weightUnit: "KG_M", weightValue: 20.9, priceUnit: "KG", estimatedPrice: 35 },
  { code: "VAR-4", name: "Varilla #4 (1/2\")", family: "Barra", material: "Grado 60", section: "OR", diameterMm: 12.7, weightUnit: "KG_M", weightValue: 0.994, priceUnit: "KG", estimatedPrice: 24.5 },
  { code: "ANG-2X2X14", name: "Ángulo 2x2x1/4", family: "Ángulo", material: "A36", section: "L", weightUnit: "KG_M", weightValue: 7.7, priceUnit: "KG", estimatedPrice: 31 },
  { code: "PTR-3X3X316", name: "PTR 3x3x3/16", family: "Barra", material: "A500 Gr.B", section: "PTR", weightUnit: "KG_M", weightValue: 13.4, priceUnit: "KG", estimatedPrice: 34 },
  { code: "CONEX-PB", name: "Placa base de conexión", family: "Conexión", material: "A36", weightUnit: "KG_PZA", weightValue: 18.5, priceUnit: "PZA", estimatedPrice: 450 },
];

export async function ensureElementTypesSeed(clienteId = "default") {
  for (const t of ELEMENT_TYPES) {
    await prisma.elementType.upsert({
      where: { clienteId_code: { clienteId, code: t.code } },
      update: {},
      create: {
        clienteId,
        code: t.code,
        name: t.name,
        family: t.family,
        material: t.material,
        section: t.section ?? null,
        diameterMm: t.diameterMm ?? null,
        thicknessMm: t.thicknessMm ?? null,
        weightUnit: t.weightUnit,
        weightValue: t.weightValue,
        priceUnit: t.priceUnit,
        estimatedPrice: t.estimatedPrice,
        active: true,
      },
    });
  }
}
