import { notFound } from "next/navigation";
import { getEmpleados, getCuadrillas } from "@/src/lib/getPersonal";
import { getCatalogosActivos } from "@/src/lib/getCatalogos";
import { getPermisoModulo } from "@/src/lib/permisos";
import EmpleadosView from "./_components/EmpleadosView";

export default async function EmpleadosPage() {
  const clienteId = "default";

  const permiso = await getPermisoModulo("personal");
  if (!permiso.ver) {
    notFound();
  }

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
