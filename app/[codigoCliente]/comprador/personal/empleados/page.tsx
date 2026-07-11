import { getEmpleados, getCuadrillas } from "@/src/lib/getPersonal";
import { getCatalogosActivos } from "@/src/lib/getCatalogos";
import EmpleadosView from "./_components/EmpleadosView";

export default async function EmpleadosPage() {
  const clienteId = "default";

  const [empleados, cuadrillas, rolesEmpleado] = await Promise.all([
    getEmpleados(clienteId),
    getCuadrillas(clienteId),
    getCatalogosActivos("ROL_EMPLEADO", clienteId),
  ]);

  return (
    <EmpleadosView
      empleados={empleados}
      cuadrillas={cuadrillas}
      rolesEmpleado={rolesEmpleado}
      clienteId={clienteId}
    />
  );
}
