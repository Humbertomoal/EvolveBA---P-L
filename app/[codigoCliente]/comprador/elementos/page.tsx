import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import { getElementTypes } from "@/src/lib/getElementTypes";
import { getCatalogosActivos } from "@/src/lib/getCatalogos";
import { getPermisoModulo } from "@/src/lib/permisos";
import ElementosView from "./_components/ElementosView";

export default async function ElementosPage({
  params,
}: {
  params: Promise<{ codigoCliente: string }>;
}) {
  const { codigoCliente } = await params;
  const basePath =
    codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;
  const clienteId = "default";

  const [elementos, familias, permiso] = await Promise.all([
    getElementTypes(clienteId),
    getCatalogosActivos("TIPO_ELEMENTO", clienteId),
    getPermisoModulo("elementos"),
  ]);

  return (
    <ElementosView
      elementos={elementos}
      familias={familias}
      permiso={permiso}
      basePath={basePath}
    />
  );
}
