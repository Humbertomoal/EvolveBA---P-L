"use client";

import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import type { ProyectoDetalleDTO } from "@/src/lib/proyectosTypes";
import type { PresupuestoPartidaDTO } from "@/src/lib/presupuestoTypes";
import type { CostAccountDTO } from "@/src/lib/costAccountTypes";
import type { PermisoModulo } from "@/src/lib/permisos";
import { usePageTitle } from "@/app/_components/PageHeaderContext";
import PresupuestoTab from "../../../_components/PresupuestoTab";

export default function PresupuestoProyectoView({
  proyecto,
  partidas,
  cuentas,
  permiso,
  clienteId,
  basePath,
}: {
  proyecto: ProyectoDetalleDTO;
  partidas: PresupuestoPartidaDTO[];
  cuentas: CostAccountDTO[];
  permiso: PermisoModulo;
  clienteId: string;
  basePath: string;
}) {
  usePageTitle(proyecto.name);

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        href={`${basePath}/comprador/presupuestos`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <IconArrowLeft className="h-4 w-4" />
        Volver a proyectos
      </Link>

      <div>
        <p className="font-mono text-xs text-zinc-400">{proyecto.code}</p>
        <h1 className="mt-0.5 text-xl font-semibold text-zinc-900">{proyecto.name}</h1>
        <p className="mt-0.5 text-sm text-zinc-500">{proyecto.clientName}</p>
      </div>

      <PresupuestoTab
        projectId={proyecto.id}
        partidas={partidas}
        cuentas={cuentas}
        permiso={permiso}
        clienteId={clienteId}
      />
    </div>
  );
}
