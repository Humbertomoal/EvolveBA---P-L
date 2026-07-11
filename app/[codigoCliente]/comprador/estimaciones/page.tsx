import { PageTitle } from "@/app/_components/PageHeaderContext";
import EmptyState from "@/src/components/EmptyState";

export default function EstimacionesPage() {
  return (
    <div>
      <PageTitle title="Estimaciones" />
      <EmptyState
        icon="IconFileInvoice"
        title="Módulo en construcción"
        description="Aquí vivirá el registro de estimaciones y su autorización."
      />
    </div>
  );
}
