import { notFound } from "next/navigation";
import { CODIGO_CLIENTE_SIN_ESPECIFICAR } from "@/src/lib/getClienteByCodigo";
import { getCuadrillaDetalle, getEmpleadosDisponibles } from "@/src/lib/getPersonal";
import CuadrillaDetalleView from "./_components/CuadrillaDetalleView";

export default async function CuadrillaDetallePage({
  params,
}: {
  params: Promise<{ codigoCliente: string; id: string }>;
}) {
  const { codigoCliente, id } = await params;
  const basePath =
    codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;
  const clienteId = "default";

  const cuadrilla = await getCuadrillaDetalle(id);
  if (!cuadrilla) {
    notFound();
  }

  const disponibles = await getEmpleadosDisponibles(clienteId);

  return (
    <CuadrillaDetalleView
      cuadrilla={cuadrilla}
      empleadosDisponibles={disponibles}
      basePath={basePath}
    />
  );
}
