import { redirect } from "next/navigation";
import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import { getCatalogosActivos } from "@/src/lib/getCatalogos";
import { getEmpleadosParaAsignar } from "@/src/lib/getProyectos";
import { getCuadrillas } from "@/src/lib/getPersonal";
import { getElementTypes } from "@/src/lib/getElementTypes";
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

  const [permiso, permisoElementos] = await Promise.all([
    getPermisoModulo("proyectos"),
    getPermisoModulo("elementos"),
  ]);
  if (!permiso.crear) {
    redirect(`${basePath}/comprador/proyectos`);
  }

  const [tipos, disponibles, cuadrillas, tiposElemento, familiasElemento] = await Promise.all([
    getCatalogosActivos("TIPO_PROYECTO", clienteId),
    getEmpleadosParaAsignar(clienteId),
    getCuadrillas(clienteId),
    getElementTypes(clienteId),
    getCatalogosActivos("TIPO_ELEMENTO", clienteId),
  ]);

  return (
    <ProyectoForm
      modo="crear"
      tipos={tipos}
      disponibles={disponibles}
      cuadrillas={cuadrillas}
      tiposElemento={tiposElemento.filter((t) => t.active)}
      familiasElemento={familiasElemento}
      puedeCrearTipoElemento={permisoElementos.crear}
      clienteId={clienteId}
      basePath={basePath}
    />
  );
}
