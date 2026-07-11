import { ensureCostAccountsSeed } from "@/src/lib/costAccountsSeed";
import { getCostAccounts } from "@/src/lib/getCostAccounts";
import { getPermisoModulo } from "@/src/lib/permisos";
import CuentasContablesView from "./_components/CuentasContablesView";

export default async function CuentasContablesPage() {
  const clienteId = "default";

  try {
    await ensureCostAccountsSeed(clienteId);
  } catch {
    // Migration not yet applied — seed skipped
  }

  const [cuentas, permiso] = await Promise.all([
    getCostAccounts(clienteId),
    getPermisoModulo("configuracion"),
  ]);

  return <CuentasContablesView cuentas={cuentas} clienteId={clienteId} permiso={permiso} />;
}
