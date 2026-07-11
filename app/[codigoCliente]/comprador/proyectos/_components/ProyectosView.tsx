"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { ProyectoDTO } from "@/src/lib/proyectosTypes";
import { PROJECT_STATUSES } from "@/src/lib/proyectosTypes";
import type { CatalogoOpcion } from "@/src/lib/getCatalogos";
import type { PermisoModulo } from "@/src/lib/permisos";
import { eliminarProyectoAction } from "@/src/lib/proyectosActions";
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

export default function ProyectosView({
  proyectos,
  tipos,
  permiso,
  basePath,
}: {
  proyectos: ProyectoDTO[];
  tipos: CatalogoOpcion[];
  permiso: PermisoModulo;
  basePath: string;
}) {
  const router = useRouter();
  usePageTitle("Proyectos");

  const [filtroEstatus, setFiltroEstatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const proyectosFiltrados = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase();
    return proyectos.filter((p) => {
      if (filtroEstatus && p.status !== filtroEstatus) return false;
      if (filtroTipo && p.type !== filtroTipo) return false;
      if (texto && !p.code.toLowerCase().includes(texto) && !p.name.toLowerCase().includes(texto)) {
        return false;
      }
      return true;
    });
  }, [proyectos, filtroEstatus, filtroTipo, filtroTexto]);

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
    {
      tipo: "select",
      titulo: "Tipo",
      opciones: [{ label: "Todos", value: "" }, ...tipos.map((t) => ({ label: t.nombre, value: t.nombre }))],
      valor: filtroTipo,
      onCambio: setFiltroTipo,
    },
  ];

  function limpiarFiltros() {
    setFiltroEstatus("");
    setFiltroTipo("");
    setFiltroTexto("");
  }

  async function handleEliminar(id: string) {
    setCargando(true);
    setBannerError(null);
    const result = await eliminarProyectoAction(id, "default");
    setCargando(false);
    setConfirmandoId(null);
    if (!result.ok) {
      setBannerError(result.error ?? "Error al eliminar.");
      toast.error(result.error ?? "No se pudo eliminar el proyecto.");
      return;
    }
    toast.success("Proyecto eliminado correctamente");
    router.refresh();
  }

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="mt-0.5 text-sm text-zinc-500">Administra los proyectos de obra</p>
        <div className="flex items-center gap-2">
          <PanelFiltros secciones={secciones} onLimpiar={limpiarFiltros} />
          {permiso.crear && (
            <Link
              href={`${basePath}/comprador/proyectos/nuevo`}
              className="flex items-center gap-1.5 rounded-md bg-[var(--color-primario)] px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--color-secundario)]"
            >
              <IconPlus className="h-4 w-4" />
              Nuevo proyecto
            </Link>
          )}
        </div>
      </div>

      {bannerError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex-1">{bannerError}</span>
          <button type="button" onClick={() => setBannerError(null)} className="shrink-0 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
        {proyectosFiltrados.length === 0 ? (
          <div className="px-4 py-2">
            <EmptyState
              icon="IconBuildingSkyscraper"
              title="Sin proyectos"
              description="Agrega el primer proyecto de obra."
              actionLabel={permiso.crear ? "Nuevo proyecto" : undefined}
              onAction={permiso.crear ? () => router.push(`${basePath}/comprador/proyectos/nuevo`) : undefined}
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
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Contrato</th>
                  <th className="px-4 py-3">Avance</th>
                  <th className="px-4 py-3">Estatus</th>
                  <th className="px-4 py-3">Inicio</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {proyectosFiltrados.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{p.code}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`${basePath}/comprador/proyectos/${p.id}`}
                        className="font-medium text-zinc-800 hover:text-[var(--color-primario)] hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{p.clientName}</td>
                    <td className="px-4 py-3 text-zinc-600">{p.type ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatImporte(p.contractAmount, "MXN")}</td>
                    <td className="px-4 py-3 text-zinc-600">{p.avancePct}%</td>
                    <td className="px-4 py-3">
                      <Badge variant={ESTATUS_VARIANT[p.status]}>{ESTATUS_LABEL[p.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{formatFecha(p.startDate)}</td>
                    <td className="px-4 py-3 text-right">
                      {confirmandoId === p.id ? (
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <span className="text-zinc-500">¿Eliminar?</span>
                          <button type="button" disabled={cargando} onClick={() => handleEliminar(p.id)} className="font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">Sí</button>
                          <button type="button" onClick={() => setConfirmandoId(null)} className="text-zinc-400 hover:text-zinc-600">No</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {permiso.editar && (
                            <Link
                              href={`${basePath}/comprador/proyectos/${p.id}/editar`}
                              title="Editar"
                              className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors duration-150"
                            >
                              Editar
                            </Link>
                          )}
                          {permiso.eliminar && (
                            <button type="button" onClick={() => setConfirmandoId(p.id)} title="Eliminar" className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors duration-150">
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
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
