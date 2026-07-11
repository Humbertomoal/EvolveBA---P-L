import { prisma } from "./prisma";
import type { ElementTypeDetalleDTO, ElementTypeDTO } from "./elementTypesTypes";

export async function getElementTypes(clienteId = "default"): Promise<ElementTypeDTO[]> {
  const tipos = await prisma.elementType.findMany({
    where: { clienteId, deletedAt: null },
    orderBy: { code: "asc" },
  });

  return tipos.map((t) => ({
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
  }));
}

export async function getElementTypeDetalle(
  id: string,
  clienteId = "default"
): Promise<ElementTypeDetalleDTO | null> {
  const t = await prisma.elementType.findFirst({
    where: { id, clienteId, deletedAt: null },
  });
  if (!t) return null;

  return {
    id: t.id,
    code: t.code,
    name: t.name,
    family: t.family,
    material: t.material,
    weightUnit: t.weightUnit,
    weightValue: t.weightValue.toNumber(),
    priceUnit: t.priceUnit,
    estimatedPrice: t.estimatedPrice.toNumber(),
    active: t.active,
    description: t.description,
    section: t.section,
    lengthM: t.lengthM?.toNumber() ?? null,
    widthMm: t.widthMm?.toNumber() ?? null,
    heightMm: t.heightMm?.toNumber() ?? null,
    thicknessMm: t.thicknessMm?.toNumber() ?? null,
    diameterMm: t.diameterMm?.toNumber() ?? null,
    paintAreaM2: t.paintAreaM2?.toNumber() ?? null,
    notes: t.notes,
  };
}
