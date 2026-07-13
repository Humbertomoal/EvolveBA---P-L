import { notFound } from "next/navigation";
import { getPayrollPeriods, getComparativoNomina } from "@/src/lib/getPayroll";
import { getPermisoModulo } from "@/src/lib/permisos";
import NominaView from "./_components/NominaView";

export default async function NominaPage() {
  const clienteId = "default";

  const permiso = await getPermisoModulo("costos");
  if (!permiso.ver) {
    notFound();
  }

  const [periodos, comparativo] = await Promise.all([
    getPayrollPeriods(clienteId),
    getComparativoNomina(clienteId),
  ]);

  return <NominaView periodos={periodos} comparativo={comparativo} permiso={permiso} clienteId={clienteId} />;
}
