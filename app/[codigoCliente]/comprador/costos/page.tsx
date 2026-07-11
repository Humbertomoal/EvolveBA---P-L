import { getCostos } from "@/src/lib/getCostos";
import { getCostAccounts } from "@/src/lib/getCostAccounts";
import { getProyectos } from "@/src/lib/getProyectos";
import { getElementosTodosProyectos } from "@/src/lib/getCaptura";
import { getPermisoModulo } from "@/src/lib/permisos";
import CostosView from "./_components/CostosView";

export default async function CostosPage() {
  const clienteId = "default";

  const [costos, cuentas, proyectos, elementos, permiso] = await Promise.all([
    getCostos(clienteId),
    getCostAccounts(clienteId),
    getProyectos(clienteId),
    getElementosTodosProyectos(clienteId),
    getPermisoModulo("costos"),
  ]);

  return (
    <CostosView
      costos={costos}
      cuentas={cuentas}
      proyectos={proyectos}
      elementos={elementos}
      permiso={permiso}
      clienteId={clienteId}
    />
  );
}
