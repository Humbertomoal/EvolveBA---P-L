// Shared constants and types for the Catálogo de Elementos (ElementType) module.
// No server imports — safe to use in Client Components.

export const WEIGHT_UNITS = [
  { value: "KG_M", label: "kg/m" },
  { value: "KG_PZA", label: "kg/pza" },
] as const;

export const PRICE_UNITS = [
  { value: "KG", label: "/kg" },
  { value: "PZA", label: "/pza" },
  { value: "M", label: "/m" },
] as const;

export type WeightUnit = (typeof WEIGHT_UNITS)[number]["value"];
export type PriceUnit = (typeof PRICE_UNITS)[number]["value"];

export type ElementTypeDTO = {
  id: string;
  code: string;
  name: string;
  family: string;
  material: string | null;
  lengthM: number | null;
  weightUnit: string;
  weightValue: number;
  priceUnit: string;
  estimatedPrice: number;
  active: boolean;
};

export type ElementTypeDetalleDTO = ElementTypeDTO & {
  description: string | null;
  section: string | null;
  widthMm: number | null;
  heightMm: number | null;
  thicknessMm: number | null;
  diameterMm: number | null;
  paintAreaM2: number | null;
  notes: string | null;
};

export type ElementTypeFormInput = {
  code: string;
  name: string;
  family: string;
  description: string | null;
  material: string | null;
  section: string | null;
  lengthM: number | null;
  widthMm: number | null;
  heightMm: number | null;
  thicknessMm: number | null;
  diameterMm: number | null;
  weightUnit: string;
  weightValue: number;
  priceUnit: string;
  estimatedPrice: number;
  paintAreaM2: number | null;
  notes: string | null;
  active: boolean;
};

export function formatPeso(weightValue: number, weightUnit: string): string {
  const unidad = WEIGHT_UNITS.find((u) => u.value === weightUnit)?.label ?? weightUnit;
  return `${weightValue.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 3 })} ${unidad}`;
}

export function formatPrecio(estimatedPrice: number, priceUnit: string): string {
  const unidad = PRICE_UNITS.find((u) => u.value === priceUnit)?.label ?? priceUnit;
  return `$${estimatedPrice.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unidad}`;
}

/**
 * Peso unitario de un elemento de obra a partir de su ElementType.
 * KG_M   → weightValue × largo
 * KG_PZA → weightValue (el largo no aplica)
 */
export function calcularPesoUnitario(weightUnit: string, weightValue: number, lengthM: number | null): number {
  if (weightUnit === "KG_M") return weightValue * (lengthM ?? 0);
  return weightValue;
}

/**
 * Costo unitario SUGERIDO (el usuario puede sobrescribirlo) a partir del
 * priceUnit del ElementType.
 * KG  → estimatedPrice × peso unitario
 * PZA → estimatedPrice
 * M   → estimatedPrice × largo
 */
export function calcularCostoSugerido(
  priceUnit: string,
  estimatedPrice: number,
  pesoUnitario: number,
  lengthM: number | null
): number {
  if (priceUnit === "KG") return estimatedPrice * pesoUnitario;
  if (priceUnit === "M") return estimatedPrice * (lengthM ?? 0);
  return estimatedPrice;
}
