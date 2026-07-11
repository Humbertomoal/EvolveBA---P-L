import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import { getProyectos } from "@/src/lib/getProyectos";
import { getCatalogosActivos } from "@/src/lib/getCatalogos";
import { getPermisoModulo } from "@/src/lib/permisos";
import ProyectosView from "./_components/ProyectosView";

export default async function ProyectosPage({
  params,
}: {
  params: Promise<{ codigoCliente: string }>;
}) {
  const { codigoCliente } = await params;
  const basePath =
    codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;
  const clienteId = "default";

  const [proyectos, tipos, permiso] = await Promise.all([
    getProyectos(clienteId),
    getCatalogosActivos("TIPO_PROYECTO", clienteId),
    getPermisoModulo("proyectos"),
  ]);

  return (
    <ProyectosView
      proyectos={proyectos}
      tipos={tipos}
      permiso={permiso}
      basePath={basePath}
    />
  );
}
