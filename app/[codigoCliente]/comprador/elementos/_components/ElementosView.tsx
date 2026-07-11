"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { ElementTypeDTO } from "@/src/lib/elementTypesTypes";
import { formatPeso, formatPrecio } from "@/src/lib/elementTypesTypes";
import type { CatalogoOpcion } from "@/src/lib/getCatalogos";
import type { PermisoModulo } from "@/src/lib/permisos";
import { eliminarElementTypeAction, toggleActivoElementTypeAction } from "@/src/lib/elementTypesActions";
import { usePageTitle } from "@/app/_components/PageHeaderContext";
import EmptyState from "@/src/components/EmptyState";
import PanelFiltros, { type SeccionFiltroConfig } from "@/app/_components/PanelFiltros";

export default function ElementosView({
  elementos,
  familias,
  permiso,
  basePath,
}: {
  elementos: ElementTypeDTO[];
  familias: CatalogoOpcion[];
  permiso: PermisoModulo;
  basePath: string;
}) {
  const router = useRouter();
  usePageTitle("Catálogo de Elementos");

  const [filtroFamilia, setFiltroFamilia] = useState("");
  const [filtroMaterial, setFiltroMaterial] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const materiales = useMemo(() => {
    const unicos = new Set(elementos.map((e) => e.material).filter((m): m is string => !!m));
    return Array.from(unicos).sort((a, b) => a.localeCompare(b));
  }, [elementos]);

  const elementosFiltrados = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase();
    return elementos.filter((e) => {
      if (filtroFamilia && e.family !== filtroFamilia) return false;
      if (filtroMaterial && e.material !== filtroMaterial) return false;
      if (filtroActivo === "activos" && !e.active) return false;
      if (filtroActivo === "inactivos" && e.active) return false;
      if (texto && !e.code.toLowerCase().includes(texto) && !e.name.toLowerCase().includes(texto)) return false;
      return true;
    });
  }, [elementos, filtroFamilia, filtroMaterial, filtroActivo, filtroTexto]);

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
      titulo: "Familia",
      opciones: [{ label: "Todas", value: "" }, ...familias.map((f) => ({ label: f.nombre, value: f.nombre }))],
      valor: filtroFamilia,
      onCambio: setFiltroFamilia,
    },
    {
      tipo: "select",
      titulo: "Material",
      opciones: [{ label: "Todos", value: "" }, ...materiales.map((m) => ({ label: m, value: m }))],
      valor: filtroMaterial,
      onCambio: setFiltroMaterial,
    },
    {
      tipo: "select",
      titulo: "Estado",
      opciones: [
        { label: "Todos", value: "" },
        { label: "Activos", value: "activos" },
        { label: "Inactivos", value: "inactivos" },
      ],
      valor: filtroActivo,
      onCambio: setFiltroActivo,
    },
  ];

  function limpiarFiltros() {
    setFiltroFamilia("");
    setFiltroMaterial("");
    setFiltroActivo("");
    setFiltroTexto("");
  }

  async function handleToggleActivo(id: string, active: boolean) {
    await toggleActivoElementTypeAction(id, "default", !active);
    toast.success(active ? "Elemento desactivado" : "Elemento activado");
    router.refresh();
  }

  async function handleEliminar(id: string) {
    setCargando(true);
    setBannerError(null);
    const result = await eliminarElementTypeAction(id, "default");
    setCargando(false);
    setConfirmandoId(null);
    if (!result.ok) {
      setBannerError(result.error ?? "Error al eliminar.");
      toast.error(result.error ?? "No se pudo eliminar el elemento.");
      return;
    }
    toast.success("Elemento eliminado correctamente");
    router.refresh();
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="mt-0.5 text-sm text-zinc-500">Catálogo maestro de tipos de elemento (perfiles, placas, barras)</p>
        <div className="flex items-center gap-2">
          <PanelFiltros secciones={secciones} onLimpiar={limpiarFiltros} />
          {permiso.crear && (
            <Link
              href={`${basePath}/comprador/elementos/nuevo`}
              className="flex items-center gap-1.5 rounded-md bg-[var(--color-primario)] px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--color-secundario)]"
            >
              <IconPlus className="h-4 w-4" />
              Nuevo elemento
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
        {elementosFiltrados.length === 0 ? (
          <div className="px-4 py-2">
            <EmptyState
              icon="IconRuler2"
              title="Sin elementos en el catálogo"
              description="Agrega el primer tipo de elemento (perfil, placa, barra...)."
              actionLabel={permiso.crear ? "Nuevo elemento" : undefined}
              onAction={permiso.crear ? () => router.push(`${basePath}/comprador/elementos/nuevo`) : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Familia</th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Peso</th>
                  <th className="px-4 py-3">Precio estimado</th>
                  <th className="px-4 py-3">Activo</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {elementosFiltrados.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{e.code}</td>
                    <td className="px-4 py-3">
                      {permiso.editar ? (
                        <Link
                          href={`${basePath}/comprador/elementos/${e.id}/editar`}
                          className="font-medium text-zinc-800 hover:text-[var(--color-primario)] hover:underline"
                        >
                          {e.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-zinc-800">{e.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{e.family}</td>
                    <td className="px-4 py-3 text-zinc-600">{e.material ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatPeso(e.weightValue, e.weightUnit)}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatPrecio(e.estimatedPrice, e.priceUnit)}</td>
                    <td className="px-4 py-3">
                      {permiso.editar ? (
                        <button
                          type="button"
                          onClick={() => handleToggleActivo(e.id, e.active)}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-150 ${e.active ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                          {e.active ? "Activo" : "Inactivo"}
                        </button>
                      ) : (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${e.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {e.active ? "Activo" : "Inactivo"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {permiso.eliminar && (
                        confirmandoId === e.id ? (
                          <div className="flex items-center justify-end gap-2 text-xs">
                            <span className="text-zinc-500">¿Eliminar?</span>
                            <button type="button" disabled={cargando} onClick={() => handleEliminar(e.id)} className="font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">Sí</button>
                            <button type="button" onClick={() => setConfirmandoId(null)} className="text-zinc-400 hover:text-zinc-600">No</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setConfirmandoId(e.id)} title="Eliminar" className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors duration-150">
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        )
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
