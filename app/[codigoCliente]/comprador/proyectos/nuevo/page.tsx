import { redirect } from "next/navigation";
import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import { getCatalogosActivos } from "@/src/lib/getCatalogos";
import { getPermisoModulo } from "@/src/lib/permisos";
import ProyectoForm from "../_components/ProyectoForm";

export default async function NuevoProyectoPage({
  params,
}: {
  params: Promise<{ codigoCliente: string }>;
}) {
  const { codigoCliente } = await params;
  const basePath =
    codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;
  const clienteId = "default";

  const permiso = await getPermisoModulo("proyectos");
  if (!permiso.crear) {
    redirect(`${basePath}/comprador/proyectos`);
  }

  const tipos = await getCatalogosActivos("TIPO_PROYECTO", clienteId);

  return <ProyectoForm modo="crear" tipos={tipos} clienteId={clienteId} basePath={basePath} />;
}
