import { PageTitle } from "@/app/_components/PageHeaderContext";
import EmptyState from "@/src/components/EmptyState";

export default function PnlPage() {
  return (
    <div>
      <PageTitle title="P&L" />
      <EmptyState
        icon="IconChartBar"
        title="Módulo en construcción"
        description="Aquí vivirá el dashboard de Ingreso, Costo real, Presupuesto, Margen y Desviación por proyecto."
      />
    </div>
  );
}
