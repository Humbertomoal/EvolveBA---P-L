"use client";

import { useState } from "react";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import type { EmpleadoAsignadoDTO, ProyectoDetalleDTO } from "@/src/lib/proyectosTypes";
import type { CuadrillaDTO } from "@/src/lib/personalTypes";
import type { ElementoParaCapturaDTO } from "@/src/lib/capturaTypes";
import type { TimeEntryHistorialDTO } from "@/src/lib/getCaptura";
import type { PermisoModulo } from "@/src/lib/permisos";
import { usePageTitle } from "@/app/_components/PageHeaderContext";
import CapturaTab from "../../../_components/CapturaTab";
import HorasTab from "../../../_components/HorasTab";

const TABS = [
  { key: "captura", label: "Captura" },
  { key: "horas", label: "Horas" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function HorasHombreProyectoView({
  proyecto,
  clienteId,
  basePath,
  elementos,
  cuadrillas,
  historialHoras,
  asignados,
  permisoCaptura,
  permisoHorasHombre,
}: {
  proyecto: ProyectoDetalleDTO;
  clienteId: string;
  basePath: string;
  elementos: ElementoParaCapturaDTO[];
  cuadrillas: CuadrillaDTO[];
  historialHoras: TimeEntryHistorialDTO[];
  asignados: EmpleadoAsignadoDTO[];
  permisoCaptura: PermisoModulo;
  permisoHorasHombre: PermisoModulo;
}) {
  usePageTitle(proyecto.name);
  const tabsVisibles = TABS.filter((t) => (t.key === "captura" ? permisoCaptura.ver : permisoHorasHombre.ver));
  const [tab, setTab] = useState<TabKey>(tabsVisibles[0]?.key ?? "captura");

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        href={`${basePath}/comprador/horas-hombre`}
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

      <div className="border-b border-zinc-200">
        <div className="flex gap-0 overflow-x-auto">
          {tabsVisibles.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-all duration-150 ${
                tab === t.key
                  ? "border-[var(--color-primario)] text-[var(--color-primario)]"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "captura" && permisoCaptura.ver && (
        <CapturaTab
          projectId={proyecto.id}
          clienteId={clienteId}
          elementos={elementos}
          cuadrillas={cuadrillas}
          permiso={permisoCaptura}
          elementoPreseleccionado={null}
        />
      )}

      {tab === "horas" && permisoHorasHombre.ver && (
        <HorasTab
          historial={historialHoras}
          empleados={asignados}
          elementos={elementos}
          permiso={permisoHorasHombre}
          clienteId={clienteId}
        />
      )}
    </div>
  );
}
