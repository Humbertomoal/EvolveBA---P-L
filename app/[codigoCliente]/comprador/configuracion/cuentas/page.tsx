import { notFound } from "next/navigation";
import { ensureCostAccountsSeed } from "@/src/lib/costAccountsSeed";
import { getCostAccounts } from "@/src/lib/getCostAccounts";
import { getPermisoModulo } from "@/src/lib/permisos";
import CuentasContablesView from "./_components/CuentasContablesView";

export default async function CuentasContablesPage() {
  const clienteId = "default";

  const permiso = await getPermisoModulo("configuracion");
  if (!permiso.ver) {
    notFound();
  }

  try {
    await ensureCostAccountsSeed(clienteId);
  } catch {
    // Migration not yet applied — seed skipped
  }

  const cuentas = await getCostAccounts(clienteId);

  return <CuentasContablesView cuentas={cuentas} clienteId={clienteId} permiso={permiso} />;
}
