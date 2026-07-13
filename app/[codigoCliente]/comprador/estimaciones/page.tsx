import { notFound } from "next/navigation";
import { getEstimacionesTodosProyectos } from "@/src/lib/getEstimaciones";
import { getProyectos } from "@/src/lib/getProyectos";
import { getPermisoModulo } from "@/src/lib/permisos";
import EstimacionesGlobalView from "./_components/EstimacionesGlobalView";

export default async function EstimacionesPage() {
  const clienteId = "default";

  const permiso = await getPermisoModulo("estimaciones");
  if (!permiso.ver) {
    notFound();
  }

  const [estimaciones, proyectos] = await Promise.all([
    getEstimacionesTodosProyectos(clienteId),
    getProyectos(clienteId),
  ]);

  return <EstimacionesGlobalView estimaciones={estimaciones} proyectos={proyectos} />;
}
