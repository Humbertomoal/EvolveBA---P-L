import { notFound, redirect } from "next/navigation";
import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import {
  getProyectoDetalle,
  getEmpleadosAsignados,
  getEmpleadosParaAsignar,
  getElementosProyecto,
} from "@/src/lib/getProyectos";
import { getCatalogosActivos } from "@/src/lib/getCatalogos";
import { getCuadrillas } from "@/src/lib/getPersonal";
import { getElementTypes } from "@/src/lib/getElementTypes";
import { getPermisoModulo } from "@/src/lib/permisos";
import ProyectoForm from "../../_components/ProyectoForm";

export default async function EditarProyectoPage({
  params,
}: {
  params: Promise<{ codigoCliente: string; id: string }>;
}) {
  const { codigoCliente, id } = await params;
  const basePath =
    codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;
  const clienteId = "default";

  const [permiso, permisoElementos] = await Promise.all([
    getPermisoModulo("proyectos"),
    getPermisoModulo("elementos"),
  ]);
  if (!permiso.editar) {
    redirect(`${basePath}/comprador/proyectos`);
  }

  const [proyecto, tipos, disponibles, cuadrillas, asignadosIniciales, tiposElemento, familiasElemento, elementosIniciales] =
    await Promise.all([
      getProyectoDetalle(id, clienteId),
      getCatalogosActivos("TIPO_PROYECTO", clienteId),
      getEmpleadosParaAsignar(clienteId),
      getCuadrillas(clienteId),
      getEmpleadosAsignados(id),
      getElementTypes(clienteId),
      getCatalogosActivos("TIPO_ELEMENTO", clienteId),
      getElementosProyecto(id),
    ]);
  if (!proyecto) {
    notFound();
  }

  return (
    <ProyectoForm
      modo="editar"
      proyecto={proyecto}
      tipos={tipos}
      disponibles={disponibles}
      cuadrillas={cuadrillas}
      asignadosIniciales={asignadosIniciales}
      tiposElemento={tiposElemento.filter((t) => t.active)}
      familiasElemento={familiasElemento}
      elementosIniciales={elementosIniciales}
      puedeCrearTipoElemento={permisoElementos.crear}
      clienteId={clienteId}
      basePath={basePath}
    />
  );
}
