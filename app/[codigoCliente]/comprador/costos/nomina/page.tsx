import { getPayrollPeriods, getComparativoNomina } from "@/src/lib/getPayroll";
import { getPermisoModulo } from "@/src/lib/permisos";
import NominaView from "./_components/NominaView";

export default async function NominaPage() {
  const clienteId = "default";

  const [periodos, comparativo, permiso] = await Promise.all([
    getPayrollPeriods(clienteId),
    getComparativoNomina(clienteId),
    getPermisoModulo("costos"),
  ]);

  return <NominaView periodos={periodos} comparativo={comparativo} permiso={permiso} clienteId={clienteId} />;
}
