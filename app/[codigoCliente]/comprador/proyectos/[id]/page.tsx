import { notFound } from "next/navigation";
import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import {
  getProyectoDetalle,
  getEmpleadosAsignados,
  getEmpleadosParaAsignar,
} from "@/src/lib/getProyectos";
import { getCuadrillas } from "@/src/lib/getPersonal";
import { getPermisoModulo } from "@/src/lib/permisos";
import ProyectoDetalleView from "./_components/ProyectoDetalleView";

export default async function ProyectoDetallePage({
  params,
}: {
  params: Promise<{ codigoCliente: string; id: string }>;
}) {
  const { codigoCliente, id } = await params;
  const basePath =
    codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;
  const clienteId = "default";

  const proyecto = await getProyectoDetalle(id, clienteId);
  if (!proyecto) {
    notFound();
  }

  const [asignados, disponibles, cuadrillas, permiso] = await Promise.all([
    getEmpleadosAsignados(id),
    getEmpleadosParaAsignar(id, clienteId),
    getCuadrillas(clienteId),
    getPermisoModulo("proyectos"),
  ]);

  return (
    <ProyectoDetalleView
      proyecto={proyecto}
      asignados={asignados}
      disponibles={disponibles}
      cuadrillas={cuadrillas}
      permiso={permiso}
      clienteId={clienteId}
      basePath={basePath}
    />
  );
}
