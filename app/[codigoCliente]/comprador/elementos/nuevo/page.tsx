import { redirect } from "next/navigation";
import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import { getCatalogosActivos } from "@/src/lib/getCatalogos";
import { getPermisoModulo } from "@/src/lib/permisos";
import ElementoTypeForm from "../_components/ElementoTypeForm";

export default async function NuevoElementoPage({
  params,
}: {
  params: Promise<{ codigoCliente: string }>;
}) {
  const { codigoCliente } = await params;
  const basePath =
    codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;
  const clienteId = "default";

  const permiso = await getPermisoModulo("elementos");
  if (!permiso.crear) {
    redirect(`${basePath}/comprador/elementos`);
  }

  const familias = await getCatalogosActivos("TIPO_ELEMENTO", clienteId);

  return <ElementoTypeForm modo="crear" familias={familias} clienteId={clienteId} basePath={basePath} />;
}
