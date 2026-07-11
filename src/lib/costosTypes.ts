// Shared constants and types for the módulo de Costos (Fase 6).
// No server imports — safe to use in Client Components.

export type CostoDTO = {
  id: string;
  date: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  projectId: string | null;
  projectCode: string | null;
  projectName: string | null;
  elementId: string | null;
  elementCode: string | null;
  supplierName: string | null;
  description: string;
  invoiceRef: string | null;
  amount: number;
  paidAt: string | null;
};

export type CostoFormInput = {
  date: string;
  accountId: string;
  projectId: string | null;
  elementId: string | null;
  supplierName: string | null;
  description: string;
  invoiceRef: string | null;
  amount: number;
  paidAt: string | null;
};

export function validarCosto(
  datos: CostoFormInput,
  cuenta: { isProject: boolean; isSystem: boolean } | undefined
): string | null {
  if (!datos.accountId) return "La cuenta es requerida.";
  if (!cuenta) return "La cuenta seleccionada no existe.";
  if (cuenta.isSystem) return "Esta cuenta se calcula automáticamente y no admite captura manual.";
  if (cuenta.isProject && !datos.projectId) return "Debes elegir un proyecto para esta cuenta.";
  if (!cuenta.isProject && datos.projectId) return "Esta cuenta es un gasto de empresa, no debe llevar proyecto.";
  if (!datos.description.trim()) return "La descripción es requerida.";
  if (!Number.isFinite(datos.amount) || datos.amount <= 0) return "El importe debe ser mayor a 0.";
  if (!datos.date) return "La fecha es requerida.";
  return null;
}
