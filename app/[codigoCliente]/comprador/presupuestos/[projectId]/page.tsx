import { notFound } from "next/navigation";
import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import { getProyectoDetalle } from "@/src/lib/getProyectos";
import { getPresupuestoProyecto } from "@/src/lib/getPresupuesto";
import { getCostAccounts } from "@/src/lib/getCostAccounts";
import { getPermisoModulo } from "@/src/lib/permisos";
import PresupuestoProyectoView from "./_components/PresupuestoProyectoView";

export default async function PresupuestoProyectoPage({
  params,
}: {
  params: Promise<{ codigoCliente: string; projectId: string }>;
}) {
  const { codigoCliente, projectId } = await params;
  const basePath = codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;
  const clienteId = "default";

  const permiso = await getPermisoModulo("presupuestos");
  if (!permiso.ver) {
    notFound();
  }

  const proyecto = await getProyectoDetalle(projectId, clienteId);
  if (!proyecto) {
    notFound();
  }

  const [partidas, cuentas] = await Promise.all([
    getPresupuestoProyecto(projectId, clienteId),
    getCostAccounts(clienteId),
  ]);

  return (
    <PresupuestoProyectoView
      proyecto={proyecto}
      partidas={partidas}
      cuentas={cuentas}
      permiso={permiso}
      clienteId={clienteId}
      basePath={basePath}
    />
  );
}
