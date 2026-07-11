import { notFound, redirect } from "next/navigation";
import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import { getElementTypeDetalle } from "@/src/lib/getElementTypes";
import { getCatalogosActivos } from "@/src/lib/getCatalogos";
import { getPermisoModulo } from "@/src/lib/permisos";
import ElementoTypeForm from "../../_components/ElementoTypeForm";

export default async function EditarElementoPage({
  params,
}: {
  params: Promise<{ codigoCliente: string; id: string }>;
}) {
  const { codigoCliente, id } = await params;
  const basePath =
    codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;
  const clienteId = "default";

  const permiso = await getPermisoModulo("elementos");
  if (!permiso.editar) {
    redirect(`${basePath}/comprador/elementos`);
  }

  const [elemento, familias] = await Promise.all([
    getElementTypeDetalle(id, clienteId),
    getCatalogosActivos("TIPO_ELEMENTO", clienteId),
  ]);
  if (!elemento) {
    notFound();
  }

  return (
    <ElementoTypeForm modo="editar" elemento={elemento} familias={familias} clienteId={clienteId} basePath={basePath} />
  );
}
