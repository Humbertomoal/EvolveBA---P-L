import { notFound } from "next/navigation";
import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import { getProyectosParaHorasHombre } from "@/src/lib/getCaptura";
import { getPermisoModulo } from "@/src/lib/permisos";
import HorasHombreListaView from "./_components/HorasHombreListaView";

export default async function HorasHombrePage({
  params,
}: {
  params: Promise<{ codigoCliente: string }>;
}) {
  const { codigoCliente } = await params;
  const basePath = codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;
  const clienteId = "default";

  const permiso = await getPermisoModulo("horas-hombre");
  if (!permiso.ver) {
    notFound();
  }

  const proyectos = await getProyectosParaHorasHombre(clienteId);

  return <HorasHombreListaView proyectos={proyectos} basePath={basePath} />;
}
