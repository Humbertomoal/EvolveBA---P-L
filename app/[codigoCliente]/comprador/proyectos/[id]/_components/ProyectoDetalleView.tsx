"use client";

import { useState } from "react";
import Link from "next/link";
import { IconArrowLeft, IconCalendar, IconCash, IconPercentage } from "@tabler/icons-react";
import type {
  EmpleadoAsignadoDTO,
  EmpleadoParaAsignarDTO,
  ProyectoDetalleDTO,
} from "@/src/lib/proyectosTypes";
import { PROJECT_STATUSES } from "@/src/lib/proyectosTypes";
import type { CuadrillaDTO } from "@/src/lib/personalTypes";
import type { PermisoModulo } from "@/src/lib/permisos";
import type { ElementoConAvanceDTO, TimeEntryHistorialDTO } from "@/src/lib/getCaptura";
import type { ElementoParaCapturaDTO } from "@/src/lib/capturaTypes";
import type { CostoDTO } from "@/src/lib/costosTypes";
import type { PresupuestoPartidaDTO } from "@/src/lib/presupuestoTypes";
import type { PartidaSelectDTO } from "@/src/lib/getPresupuesto";
import type { CostAccountDTO } from "@/src/lib/costAccountTypes";
import { formatImporte } from "@/src/lib/monedas";
import { usePageTitle } from "@/app/_components/PageHeaderContext";
import EmptyState from "@/src/components/EmptyState";
import Badge, { type BadgeVariant } from "@/src/components/Badge";
import PersonalTab from "./PersonalTab";
import CapturaTab from "./CapturaTab";
import ElementosTab from "./ElementosTab";
import HorasTab from "./HorasTab";
import CostosTab from "./CostosTab";
import PresupuestoTab from "./PresupuestoTab";

const ESTATUS_VARIANT: Record<ProyectoDetalleDTO["status"], BadgeVariant> = {
  PLANEACION: "info",
  EN_CURSO: "success",
  SUSPENDIDA: "warning",
  CERRADA: "neutral",
};

const ESTATUS_LABEL: Record<ProyectoDetalleDTO["status"], string> = Object.fromEntries(
  PROJECT_STATUSES.map((s) => [s.value, s.label])
) as Record<ProyectoDetalleDTO["status"], string>;

const TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "personal", label: "Personal" },
  { key: "presupuesto", label: "Presupuesto" },
  { key: "elementos", label: "Elementos" },
  { key: "captura", label: "Captura" },
  { key: "costos", label: "Costos" },
  { key: "horas", label: "Horas" },
  { key: "estimaciones", label: "Estimaciones" },
  { key: "pnl", label: "P&L" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function diasTranscurridos(startDateIso: string) {
  const inicio = new Date(startDateIso);
  const ahora = new Date();
  const diff = Math.floor((ahora.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  return diff < 0 ? 0 : diff;
}

export default function ProyectoDetalleView({
  proyecto,
  asignados,
  disponibles,
  cuadrillas,
  permiso,
  permisoCaptura,
  permisoHorasHombre,
  permisoPresupuesto,
  elementosParaCaptura,
  elementosConAvance,
  historialHoras,
  costosProyecto,
  moAplicada,
  cuentaNominaOperativa,
  presupuesto,
  partidasSelect,
  cuentas,
  clienteId,
  basePath,
}: {
  proyecto: ProyectoDetalleDTO;
  asignados: EmpleadoAsignadoDTO[];
  disponibles: EmpleadoParaAsignarDTO[];
  cuadrillas: CuadrillaDTO[];
  permiso: PermisoModulo;
  permisoCaptura: PermisoModulo;
  permisoHorasHombre: PermisoModulo;
  permisoPresupuesto: PermisoModulo;
  elementosParaCaptura: ElementoParaCapturaDTO[];
  elementosConAvance: ElementoConAvanceDTO[];
  historialHoras: TimeEntryHistorialDTO[];
  costosProyecto: CostoDTO[];
  moAplicada: number;
  cuentaNominaOperativa: { code: string; name: string } | null;
  presupuesto: PresupuestoPartidaDTO[];
  partidasSelect: PartidaSelectDTO[];
  cuentas: CostAccountDTO[];
  clienteId: string;
  basePath: string;
}) {
  usePageTitle(proyecto.name);
  const [tab, setTab] = useState<TabKey>("resumen");
  const [elementoCapturaPreseleccionado, setElementoCapturaPreseleccionado] = useState<string | null>(null);

  function irACaptura(elementId: string) {
    setElementoCapturaPreseleccionado(elementId);
    setTab("captura");
  }

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        href={`${basePath}/comprador/proyectos`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <IconArrowLeft className="h-4 w-4" />
        Volver a proyectos
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-zinc-400">{proyecto.code}</p>
          <h1 className="mt-0.5 text-xl font-semibold text-zinc-900">{proyecto.name}</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{proyecto.clientName}</p>
        </div>
        <Badge variant={ESTATUS_VARIANT[proyecto.status]}>{ESTATUS_LABEL[proyecto.status]}</Badge>
      </div>

      <div className="border-b border-zinc-200">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((t) => (
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

      {tab === "resumen" && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card icon={<IconCash className="h-5 w-5" />} label="Contrato" valor={formatImporte(proyecto.contractAmount, "MXN")} />
            <Card icon={<IconCash className="h-5 w-5" />} label="Anticipo" valor={formatImporte(proyecto.advanceAmount, "MXN")} />
            <Card icon={<IconPercentage className="h-5 w-5" />} label="Retención" valor={`${proyecto.retentionPct}%`} />
            <Card icon={<IconCalendar className="h-5 w-5" />} label="Días transcurridos" valor={String(diasTranscurridos(proyecto.startDate))} />
          </div>

          <div className="rounded-card border border-border bg-white p-5 shadow-card">
            <h2 className="text-sm font-semibold text-zinc-900">Ficha del proyecto</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Ficha label="Tipo" valor={proyecto.type ?? "—"} />
              <Ficha label="Avance" valor={`${proyecto.avancePct}%`} />
              <Ficha label="Fecha de inicio" valor={formatFecha(proyecto.startDate)} />
              <Ficha label="Fecha de fin" valor={proyecto.endDate ? formatFecha(proyecto.endDate) : "—"} />
            </dl>
            {proyecto.notes && (
              <div className="mt-4 border-t border-zinc-100 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Notas</p>
                <p className="mt-1 text-sm text-zinc-700 whitespace-pre-wrap">{proyecto.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "personal" && (
        <PersonalTab
          projectId={proyecto.id}
          asignados={asignados}
          disponibles={disponibles}
          cuadrillas={cuadrillas}
          permiso={permiso}
          clienteId={clienteId}
        />
      )}

      {tab === "presupuesto" && (
        <PresupuestoTab
          projectId={proyecto.id}
          partidas={presupuesto}
          cuentas={cuentas}
          permiso={permisoPresupuesto}
          clienteId={clienteId}
        />
      )}

      {tab === "elementos" && (
        <ElementosTab
          elementos={elementosConAvance}
          avanceProyecto={proyecto.avancePct}
          partidas={partidasSelect}
          permisoCaptura={permisoCaptura}
          permisoPresupuesto={permisoPresupuesto}
          clienteId={clienteId}
          onIrACaptura={irACaptura}
        />
      )}

      {tab === "captura" && (
        <CapturaTab
          projectId={proyecto.id}
          clienteId={clienteId}
          elementos={elementosParaCaptura}
          cuadrillas={cuadrillas}
          permiso={permisoCaptura}
          elementoPreseleccionado={elementoCapturaPreseleccionado}
        />
      )}

      {tab === "horas" && (
        <HorasTab
          historial={historialHoras}
          empleados={asignados}
          elementos={elementosParaCaptura}
          permiso={permisoHorasHombre}
          clienteId={clienteId}
        />
      )}

      {tab === "costos" && (
        <CostosTab costos={costosProyecto} moAplicada={moAplicada} cuentaNominaOperativa={cuentaNominaOperativa} />
      )}

      {tab !== "resumen" &&
        tab !== "personal" &&
        tab !== "presupuesto" &&
        tab !== "elementos" &&
        tab !== "captura" &&
        tab !== "horas" &&
        tab !== "costos" && (
          <EmptyState
            icon="IconClock"
            title="Disponible en próxima fase"
            description={`La pestaña "${TABS.find((t) => t.key === tab)?.label}" se implementa en una fase posterior.`}
          />
        )}
    </div>
  );
}

function Card({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: string }) {
  return (
    <div className="relative rounded-card border border-border bg-white p-4 shadow-card">
      <div className="absolute top-4 right-4 text-primary/60">{icon}</div>
      <p className="pr-6 text-xs font-medium tracking-wide text-zinc-400 uppercase">{label}</p>
      <p className="mt-1.5 text-lg font-semibold text-zinc-800">{valor}</p>
    </div>
  );
}

function Ficha({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-zinc-800">{valor}</dd>
    </div>
  );
}
