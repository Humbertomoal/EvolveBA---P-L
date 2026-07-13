"use server";

import { getPermisoModulo } from "./permisos";
import { getPnlEmpresa } from "./getPnl";
import type { PeriodoTipo, PnlEmpresaDTO } from "./pnlTypes";

// El P&L de EMPRESA es información sensible: solo Administrador. En este
// sistema, `permiso.eliminar` es el único distintivo real entre Admin y
// Gerente (ambos tienen `ver` en "pnl") — mismo patrón que "regresar a
// Borrador" en Estimaciones (Fase 8).
export async function obtenerPnlEmpresaAction(
  clienteId: string,
  tipo: PeriodoTipo,
  anio: number,
  mes: number,
  desdeCustom?: string,
  hastaCustom?: string
): Promise<{ ok: boolean; error?: string; data?: PnlEmpresaDTO }> {
  const permiso = await getPermisoModulo("pnl");
  if (!permiso.eliminar) {
    return { ok: false, error: "El P&L de empresa es información sensible, solo un administrador puede verlo." };
  }

  const data = await getPnlEmpresa(clienteId, tipo, anio, mes, desdeCustom, hastaCustom);
  return { ok: true, data };
}
