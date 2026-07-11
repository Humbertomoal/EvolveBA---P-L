import { PageTitle } from "@/app/_components/PageHeaderContext";
import EmptyState from "@/src/components/EmptyState";

export default function CostosPage() {
  return (
    <div>
      <PageTitle title="Costos" />
      <EmptyState
        icon="IconReceipt2"
        title="Módulo en construcción"
        description="Aquí vivirá la captura de costos reales por proyecto."
      />
    </div>
  );
}
