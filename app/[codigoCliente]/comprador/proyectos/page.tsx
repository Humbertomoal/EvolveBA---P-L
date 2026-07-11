import { PageTitle } from "@/app/_components/PageHeaderContext";
import EmptyState from "@/src/components/EmptyState";

export default function ProyectosPage() {
  return (
    <div>
      <PageTitle title="Proyectos" />
      <EmptyState
        icon="IconBuildingSkyscraper"
        title="Módulo en construcción"
        description="Aquí vivirá el listado y alta de proyectos de obra."
      />
    </div>
  );
}
