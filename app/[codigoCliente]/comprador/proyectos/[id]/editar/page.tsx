import { notFound, redirect } from "next/navigation";
import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import { getProyectoDetalle } from "@/src/lib/getProyectos";
import { getCatalogosActivos } from "@/src/lib/getCatalogos";
import { getPermisoModulo } from "@/src/lib/permisos";
import ProyectoForm from "../../_components/ProyectoForm";

export default async function EditarProyectoPage({
  params,
}: {
  params: Promise<{ codigoCliente: string; id: string }>;
}) {
  const { codigoCliente, id } = await params;
  const basePath =
    codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;
  const clienteId = "default";

  const permiso = await getPermisoModulo("proyectos");
  if (!permiso.editar) {
    redirect(`${basePath}/comprador/proyectos`);
  }

  const [proyecto, tipos] = await Promise.all([
    getProyectoDetalle(id, clienteId),
    getCatalogosActivos("TIPO_PROYECTO", clienteId),
  ]);
  if (!proyecto) {
    notFound();
  }

  return (
    <ProyectoForm modo="editar" proyecto={proyecto} tipos={tipos} clienteId={clienteId} basePath={basePath} />
  );
}
