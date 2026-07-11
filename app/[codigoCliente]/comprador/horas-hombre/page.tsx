import { PageTitle } from "@/app/_components/PageHeaderContext";
import EmptyState from "@/src/components/EmptyState";

export default function HorasHombrePage() {
  return (
    <div>
      <PageTitle title="Horas-hombre" />
      <EmptyState
        icon="IconClock"
        title="Módulo en construcción"
        description="Aquí vivirá la captura de horas por empleado y proyecto."
      />
    </div>
  );
}
