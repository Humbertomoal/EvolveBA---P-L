import { PageTitle } from "@/app/_components/PageHeaderContext";
import EmptyState from "@/src/components/EmptyState";

export default function PresupuestosPage() {
  return (
    <div>
      <PageTitle title="Presupuestos" />
      <EmptyState
        icon="IconClipboardList"
        title="Módulo en construcción"
        description="Aquí vivirá el catálogo de partidas presupuestales (BudgetItem) por proyecto."
      />
    </div>
  );
}
