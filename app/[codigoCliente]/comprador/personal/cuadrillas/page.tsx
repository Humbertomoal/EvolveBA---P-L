import { notFound } from "next/navigation";
import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import { getCuadrillas, getEmpleados } from "@/src/lib/getPersonal";
import { getPermisoModulo } from "@/src/lib/permisos";
import CuadrillasView from "./_components/CuadrillasView";

export default async function CuadrillasPage({
  params,
}: {
  params: Promise<{ codigoCliente: string }>;
}) {
  const { codigoCliente } = await params;
  const basePath =
    codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;
  const clienteId = "default";

  const permiso = await getPermisoModulo("personal");
  if (!permiso.ver) {
    notFound();
  }

  const [cuadrillas, empleados] = await Promise.all([
    getCuadrillas(clienteId),
    getEmpleados(clienteId),
  ]);

  const lideresDisponibles = empleados.filter((e) => e.isLeader && e.active);

  return (
    <CuadrillasView
      cuadrillas={cuadrillas}
      lideresDisponibles={lideresDisponibles}
      clienteId={clienteId}
      basePath={basePath}
    />
  );
}
