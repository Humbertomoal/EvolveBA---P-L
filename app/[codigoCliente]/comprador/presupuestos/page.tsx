import { notFound } from "next/navigation";
import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import { getProyectos } from "@/src/lib/getProyectos";
import { getPermisoModulo } from "@/src/lib/permisos";
import PresupuestosListaView from "./_components/PresupuestosListaView";

export default async function PresupuestosPage({
  params,
}: {
  params: Promise<{ codigoCliente: string }>;
}) {
  const { codigoCliente } = await params;
  const basePath = codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;
  const clienteId = "default";

  const permiso = await getPermisoModulo("presupuestos");
  if (!permiso.ver) {
    notFound();
  }

  const proyectos = await getProyectos(clienteId);

  return <PresupuestosListaView proyectos={proyectos} basePath={basePath} />;
}
