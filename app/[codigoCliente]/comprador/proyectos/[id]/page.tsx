import { notFound } from "next/navigation";
import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import {
  getProyectoDetalle,
  getEmpleadosAsignados,
  getEmpleadosParaAsignar,
} from "@/src/lib/getProyectos";
import { getCuadrillas } from "@/src/lib/getPersonal";
import {
  getElementosParaCaptura,
  getElementosConAvance,
  getHistorialHoras,
} from "@/src/lib/getCaptura";
import { getCostosProyecto, getManoDeObraAplicadaProyecto } from "@/src/lib/getCostos";
import { getCostAccounts } from "@/src/lib/getCostAccounts";
import { getPresupuestoProyecto, getPartidasProyecto } from "@/src/lib/getPresupuesto";
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

  const [
    asignados,
    disponibles,
    cuadrillas,
    permiso,
    permisoCaptura,
    permisoHorasHombre,
    permisoPresupuesto,
    elementosParaCaptura,
    elementosConAvance,
    historialHoras,
    costosProyecto,
    moAplicada,
    cuentas,
    presupuesto,
    partidasSelect,
  ] = await Promise.all([
    getEmpleadosAsignados(id),
    getEmpleadosParaAsignar(clienteId),
    getCuadrillas(clienteId),
    getPermisoModulo("proyectos"),
    getPermisoModulo("captura"),
    getPermisoModulo("horas-hombre"),
    getPermisoModulo("presupuestos"),
    getElementosParaCaptura(id),
    getElementosConAvance(id),
    getHistorialHoras(id),
    getCostosProyecto(id),
    getManoDeObraAplicadaProyecto(id),
    getCostAccounts(clienteId),
    getPresupuestoProyecto(id, clienteId),
    getPartidasProyecto(id),
  ]);

  const cuentaNominaOperativa = cuentas.find((c) => c.code === "2.8") ?? null;

  return (
    <ProyectoDetalleView
      proyecto={proyecto}
      asignados={asignados}
      disponibles={disponibles}
      cuadrillas={cuadrillas}
      permiso={permiso}
      permisoCaptura={permisoCaptura}
      permisoHorasHombre={permisoHorasHombre}
      permisoPresupuesto={permisoPresupuesto}
      elementosParaCaptura={elementosParaCaptura}
      elementosConAvance={elementosConAvance}
      historialHoras={historialHoras}
      costosProyecto={costosProyecto}
      moAplicada={moAplicada}
      cuentaNominaOperativa={
        cuentaNominaOperativa ? { code: cuentaNominaOperativa.code, name: cuentaNominaOperativa.name } : null
      }
      presupuesto={presupuesto}
      partidasSelect={partidasSelect}
      cuentas={cuentas}
      clienteId={clienteId}
      basePath={basePath}
    />
  );
}
