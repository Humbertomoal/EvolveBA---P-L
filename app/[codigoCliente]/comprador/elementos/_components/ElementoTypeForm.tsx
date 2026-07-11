"use client";

import { useRouter } from "next/navigation";
import type { ElementTypeDetalleDTO } from "@/src/lib/elementTypesTypes";
import type { CatalogoOpcion } from "@/src/lib/getCatalogos";
import { usePageTitle } from "@/app/_components/PageHeaderContext";
import ElementoTypeFormFields from "./ElementoTypeFormFields";

export default function ElementoTypeForm({
  modo,
  elemento,
  familias,
  clienteId,
  basePath,
}: {
  modo: "crear" | "editar";
  elemento?: ElementTypeDetalleDTO;
  familias: CatalogoOpcion[];
  clienteId: string;
  basePath: string;
}) {
  const router = useRouter();
  usePageTitle(modo === "crear" ? "Nuevo elemento" : "Editar elemento");

  return (
    <div className="max-w-3xl">
      <ElementoTypeFormFields
        modo={modo}
        elemento={elemento}
        familias={familias}
        clienteId={clienteId}
        onGuardado={() => {
          router.push(`${basePath}/comprador/elementos`);
          router.refresh();
        }}
        onCancelar={() => router.back()}
      />
    </div>
  );
}
