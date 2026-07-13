import { notFound } from "next/navigation";
import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import { getProyectoDetalle, getEmpleadosAsignados } from "@/src/lib/getProyectos";
import { getCuadrillas } from "@/src/lib/getPersonal";
import { getElementosParaCaptura, getHistorialHoras } from "@/src/lib/getCaptura";
import { getPermisoModulo } from "@/src/lib/permisos";
import HorasHombreProyectoView from "./_components/HorasHombreProyectoView";

export default async function HorasHombreProyectoPage({
  params,
}: {
  params: Promise<{ codigoCliente: string; projectId: string }>;
}) {
  const { codigoCliente, projectId } = await params;
  const basePath = codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;
  const clienteId = "default";

  const permisoHorasHombre = await getPermisoModulo("horas-hombre");
  if (!permisoHorasHombre.ver) {
    notFound();
  }

  const proyecto = await getProyectoDetalle(projectId, clienteId);
  if (!proyecto) {
    notFound();
  }

  const [permisoCaptura, elementos, cuadrillas, historialHoras, asignados] = await Promise.all([
    getPermisoModulo("captura"),
    getElementosParaCaptura(projectId),
    getCuadrillas(clienteId),
    getHistorialHoras(projectId),
    getEmpleadosAsignados(projectId),
  ]);

  return (
    <HorasHombreProyectoView
      proyecto={proyecto}
      clienteId={clienteId}
      basePath={basePath}
      elementos={elementos}
      cuadrillas={cuadrillas}
      historialHoras={historialHoras}
      asignados={asignados}
      permisoCaptura={permisoCaptura}
      permisoHorasHombre={permisoHorasHombre}
    />
  );
}
