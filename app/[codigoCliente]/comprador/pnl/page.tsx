import { notFound } from "next/navigation";
import { getComparativoProyectos, getPnlEmpresa } from "@/src/lib/getPnl";
import { getPermisoModulo } from "@/src/lib/permisos";
import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import PnlDashboardView from "./_components/PnlDashboardView";

export default async function PnlPage({
  params,
}: {
  params: Promise<{ codigoCliente: string }>;
}) {
  const { codigoCliente } = await params;
  const basePath = codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;
  const clienteId = "default";

  const permiso = await getPermisoModulo("pnl");
  if (!permiso.ver) {
    notFound();
  }

  const puedeVerEmpresa = permiso.eliminar; // solo Admin — ver pnlActions.ts

  const hoy = new Date();
  const [comparativo, empresaInicial] = await Promise.all([
    getComparativoProyectos(clienteId),
    puedeVerEmpresa
      ? getPnlEmpresa(clienteId, "MES", hoy.getFullYear(), hoy.getMonth() + 1)
      : Promise.resolve(null),
  ]);

  return (
    <PnlDashboardView
      comparativo={comparativo}
      empresaInicial={empresaInicial}
      puedeVerEmpresa={puedeVerEmpresa}
      clienteId={clienteId}
      basePath={basePath}
    />
  );
}
