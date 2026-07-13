import { notFound, redirect } from "next/navigation";
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
import { getEstimacionesProyecto, getResumenFacturacion } from "@/src/lib/getEstimaciones";
import { getPnlProyecto } from "@/src/lib/getPnl";
import { getPermisoModulo } from "@/src/lib/permisos";
import ProyectoDetalleView from "./_components/ProyectoDetalleView";

export default async function ProyectoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ codigoCliente: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { codigoCliente, id } = await params;
  const { tab } = await searchParams;
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
    permisoCostos,
    permisoEstimaciones,
    permisoPnl,
    elementosParaCaptura,
    elementosConAvance,
    historialHoras,
    cuentas,
    partidasSelect,
    resumenFacturacion,
  ] = await Promise.all([
    getEmpleadosAsignados(id),
    getEmpleadosParaAsignar(clienteId),
    getCuadrillas(clienteId),
    getPermisoModulo("proyectos"),
    getPermisoModulo("captura"),
    getPermisoModulo("horas-hombre"),
    getPermisoModulo("presupuestos"),
    getPermisoModulo("costos"),
    getPermisoModulo("estimaciones"),
    getPermisoModulo("pnl"),
    getElementosParaCaptura(id),
    getElementosConAvance(id),
    getHistorialHoras(id),
    getCostAccounts(clienteId),
    getPartidasProyecto(id),
    getResumenFacturacion(id),
  ]);

  // Rebote server-side: si la URL pide una pestaña financiera que este usuario
  // no puede ver (?tab=presupuesto|costos|estimaciones|pnl tecleado a mano),
  // no basta con ocultar el botón — se redirige antes de renderizar nada.
  const TAB_PERMITIDO: Record<string, boolean> = {
    presupuesto: permisoPresupuesto.ver,
    costos: permisoCostos.ver,
    estimaciones: permisoEstimaciones.ver,
    pnl: permisoPnl.ver,
  };
  if (tab && tab in TAB_PERMITIDO && !TAB_PERMITIDO[tab]) {
    redirect(`${basePath}/comprador/proyectos/${id}`);
  }

  // Los datos financieros solo se traen del servidor si el usuario tiene
  // permiso de verlos — si no, ni siquiera viajan en el payload al cliente.
  const [presupuesto, costosProyecto, moAplicada, estimaciones, pnl] = await Promise.all([
    permisoPresupuesto.ver ? getPresupuestoProyecto(id, clienteId) : Promise.resolve([]),
    permisoCostos.ver ? getCostosProyecto(id) : Promise.resolve([]),
    permisoCostos.ver ? getManoDeObraAplicadaProyecto(id) : Promise.resolve(0),
    permisoEstimaciones.ver ? getEstimacionesProyecto(id) : Promise.resolve([]),
    permisoPnl.ver ? getPnlProyecto(id, clienteId) : Promise.resolve(null),
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
      permisoCostos={permisoCostos}
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
      permisoEstimaciones={permisoEstimaciones}
      estimaciones={estimaciones}
      resumenFacturacion={resumenFacturacion}
      permisoPnl={permisoPnl}
      pnl={pnl}
      clienteId={clienteId}
      basePath={basePath}
    />
  );
}
