"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProyectoDTO } from "@/src/lib/proyectosTypes";
import { PROJECT_STATUSES } from "@/src/lib/proyectosTypes";
import { formatImporte } from "@/src/lib/monedas";
import { usePageTitle } from "@/app/_components/PageHeaderContext";
import EmptyState from "@/src/components/EmptyState";
import Badge, { type BadgeVariant } from "@/src/components/Badge";
import PanelFiltros, { type SeccionFiltroConfig } from "@/app/_components/PanelFiltros";

const ESTATUS_VARIANT: Record<ProyectoDTO["status"], BadgeVariant> = {
  PLANEACION: "info",
  EN_CURSO: "success",
  SUSPENDIDA: "warning",
  CERRADA: "neutral",
};

const ESTATUS_LABEL: Record<ProyectoDTO["status"], string> = Object.fromEntries(
  PROJECT_STATUSES.map((s) => [s.value, s.label])
) as Record<ProyectoDTO["status"], string>;

export default function PresupuestosListaView({
  proyectos,
  basePath,
}: {
  proyectos: ProyectoDTO[];
  basePath: string;
}) {
  const router = useRouter();
  usePageTitle("Presupuestos");

  const [filtroEstatus, setFiltroEstatus] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");

  const proyectosFiltrados = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase();
    return proyectos.filter((p) => {
      if (filtroEstatus && p.status !== filtroEstatus) return false;
      if (texto && !p.code.toLowerCase().includes(texto) && !p.name.toLowerCase().includes(texto)) {
        return false;
      }
      return true;
    });
  }, [proyectos, filtroEstatus, filtroTexto]);

  const secciones: SeccionFiltroConfig[] = [
    {
      tipo: "texto",
      titulo: "Código o nombre",
      placeholder: "Buscar...",
      valor: filtroTexto,
      onCambio: setFiltroTexto,
    },
    {
      tipo: "select",
      titulo: "Estatus",
      opciones: [{ label: "Todos", value: "" }, ...PROJECT_STATUSES.map((s) => ({ label: s.label, value: s.value }))],
      valor: filtroEstatus,
      onCambio: setFiltroEstatus,
    },
  ];

  function limpiarFiltros() {
    setFiltroEstatus("");
    setFiltroTexto("");
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="mt-0.5 text-sm text-zinc-500">Elige un proyecto para ver o editar su presupuesto</p>
        <PanelFiltros secciones={secciones} onLimpiar={limpiarFiltros} />
      </div>

      <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
        {proyectosFiltrados.length === 0 ? (
          <div className="px-4 py-2">
            <EmptyState
              icon="IconClipboardList"
              title="Sin proyectos"
              description="No hay proyectos que coincidan con el filtro."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Contrato</th>
                  <th className="px-4 py-3">Avance</th>
                  <th className="px-4 py-3">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {proyectosFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`${basePath}/comprador/presupuestos/${p.id}`)}
                    className="cursor-pointer hover:bg-zinc-50/50 transition-colors duration-150"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{p.code}</td>
                    <td className="px-4 py-3 font-medium text-zinc-800">{p.name}</td>
                    <td className="px-4 py-3 text-zinc-600">{p.clientName}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatImporte(p.contractAmount, "MXN")}</td>
                    <td className="px-4 py-3 text-zinc-600">{p.avancePct}%</td>
                    <td className="px-4 py-3">
                      <Badge variant={ESTATUS_VARIANT[p.status]}>{ESTATUS_LABEL[p.status]}</Badge>
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
