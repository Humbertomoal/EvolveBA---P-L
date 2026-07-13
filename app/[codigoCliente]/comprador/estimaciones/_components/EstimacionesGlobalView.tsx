"use client";

import { useMemo, useState } from "react";
import { IconFileInvoice } from "@tabler/icons-react";
import type { EstimacionListDTO, EstimateStatus } from "@/src/lib/estimacionesTypes";
import { ESTATUS_INGRESO, ESTIMATE_STATUSES } from "@/src/lib/estimacionesTypes";
import type { ProyectoDTO } from "@/src/lib/proyectosTypes";
import { formatImporte } from "@/src/lib/monedas";
import { usePageTitle } from "@/app/_components/PageHeaderContext";
import EmptyState from "@/src/components/EmptyState";
import Badge, { type BadgeVariant } from "@/src/components/Badge";
import PanelFiltros, { type SeccionFiltroConfig } from "@/app/_components/PanelFiltros";

const ESTATUS_VARIANT: Record<EstimateStatus, BadgeVariant> = {
  BORRADOR: "neutral",
  ENVIADA: "info",
  AUTORIZADA: "warning",
  PAGADA: "success",
};

const ESTATUS_LABEL: Record<EstimateStatus, string> = Object.fromEntries(
  ESTIMATE_STATUSES.map((s) => [s.value, s.label])
) as Record<EstimateStatus, string>;

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function EstimacionesGlobalView({
  estimaciones,
  proyectos,
}: {
  estimaciones: EstimacionListDTO[];
  proyectos: ProyectoDTO[];
}) {
  usePageTitle("Estimaciones");

  const [filtroProyecto, setFiltroProyecto] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const filtradas = useMemo(() => {
    return estimaciones.filter((e) => {
      if (filtroProyecto && e.projectId !== filtroProyecto) return false;
      if (filtroEstatus && e.status !== filtroEstatus) return false;
      const inicio = e.periodStart.slice(0, 10);
      const fin = e.periodEnd.slice(0, 10);
      if (fechaDesde && fin < fechaDesde) return false;
      if (fechaHasta && inicio > fechaHasta) return false;
      return true;
    });
  }, [estimaciones, filtroProyecto, filtroEstatus, fechaDesde, fechaHasta]);

  const facturado = filtradas.filter((e) => ESTATUS_INGRESO.includes(e.status)).reduce((acc, e) => acc + e.grossAmount, 0);
  const retenido = filtradas.filter((e) => ESTATUS_INGRESO.includes(e.status)).reduce((acc, e) => acc + e.retention, 0);
  const porCobrar = filtradas.filter((e) => e.status === "AUTORIZADA").reduce((acc, e) => acc + e.netAmount, 0);

  const secciones: SeccionFiltroConfig[] = [
    {
      tipo: "select",
      titulo: "Proyecto",
      opciones: [{ label: "Todos", value: "" }, ...proyectos.map((p) => ({ label: `${p.code} - ${p.name}`, value: p.id }))],
      valor: filtroProyecto,
      onCambio: setFiltroProyecto,
    },
    {
      tipo: "select",
      titulo: "Estatus",
      opciones: [{ label: "Todos", value: "" }, ...ESTIMATE_STATUSES.map((s) => ({ label: s.label, value: s.value }))],
      valor: filtroEstatus,
      onCambio: setFiltroEstatus,
    },
  ];

  function limpiarFiltros() {
    setFiltroProyecto("");
    setFiltroEstatus("");
    setFechaDesde("");
    setFechaHasta("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">Todas las estimaciones de todos los proyectos — vista de cobranza</p>
        <div className="flex items-center gap-2">
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs" />
          <span className="text-xs text-zinc-400">a</span>
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs" />
          <PanelFiltros secciones={secciones} onLimpiar={limpiarFiltros} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card label="Facturado (Autorizada + Pagada)" valor={formatImporte(facturado, "MXN")} />
        <Card label="Retenido acumulado" valor={formatImporte(retenido, "MXN")} />
        <Card label="Por cobrar (Autorizada, sin pagar)" valor={formatImporte(porCobrar, "MXN")} />
      </div>

      <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
        {filtradas.length === 0 ? (
          <div className="px-4 py-2">
            <EmptyState icon="IconFileInvoice" title="Sin estimaciones" description="No hay estimaciones que coincidan con el filtro." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                  <th className="px-3 py-2.5">Proyecto</th>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Periodo</th>
                  <th className="px-3 py-2.5">Avance</th>
                  <th className="px-3 py-2.5">Bruto</th>
                  <th className="px-3 py-2.5">Retención</th>
                  <th className="px-3 py-2.5">Amortiz.</th>
                  <th className="px-3 py-2.5">Neto</th>
                  <th className="px-3 py-2.5">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtradas.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                    <td className="px-3 py-2.5 text-zinc-700">
                      <span className="font-mono text-xs text-zinc-400">{e.projectCode}</span> {e.projectName}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500">{e.number}</td>
                    <td className="px-3 py-2.5 text-zinc-600">{formatFecha(e.periodStart)} - {formatFecha(e.periodEnd)}</td>
                    <td className="px-3 py-2.5 text-zinc-700">{e.progressPct}%</td>
                    <td className="px-3 py-2.5 text-zinc-800">{formatImporte(e.grossAmount, "MXN")}</td>
                    <td className="px-3 py-2.5 text-zinc-600">{formatImporte(e.retention, "MXN")}</td>
                    <td className="px-3 py-2.5 text-zinc-600">{formatImporte(e.advanceAmort, "MXN")}</td>
                    <td className="px-3 py-2.5 font-medium text-zinc-800">{formatImporte(e.netAmount, "MXN")}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={ESTATUS_VARIANT[e.status]}>{ESTATUS_LABEL[e.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="relative rounded-card border border-border bg-white p-4 shadow-card">
      <div className="absolute top-4 right-4 text-primary/60">
        <IconFileInvoice className="h-5 w-5" />
      </div>
      <p className="pr-6 text-xs font-medium tracking-wide text-zinc-400 uppercase">{label}</p>
      <p className="mt-1.5 text-lg font-semibold text-zinc-800">{valor}</p>
    </div>
  );
}
