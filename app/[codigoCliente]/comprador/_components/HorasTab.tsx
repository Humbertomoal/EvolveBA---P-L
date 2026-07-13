"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { TimeEntryHistorialDTO } from "@/src/lib/getCaptura";
import type { EmpleadoAsignadoDTO } from "@/src/lib/proyectosTypes";
import type { ElementoParaCapturaDTO } from "@/src/lib/capturaTypes";
import type { PermisoModulo } from "@/src/lib/permisos";
import { actualizarTimeEntryAction, eliminarTimeEntryAction } from "@/src/lib/capturaActions";
import { formatImporte } from "@/src/lib/monedas";
import EmptyState from "@/src/components/EmptyState";
import PanelFiltros, { type SeccionFiltroConfig } from "@/app/_components/PanelFiltros";

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function HorasTab({
  historial,
  empleados,
  elementos,
  permiso,
  clienteId,
}: {
  historial: TimeEntryHistorialDTO[];
  empleados: EmpleadoAsignadoDTO[];
  elementos: ElementoParaCapturaDTO[];
  permiso: PermisoModulo;
  clienteId: string;
}) {
  const router = useRouter();

  const [filtroEmpleado, setFiltroEmpleado] = useState("");
  const [filtroElemento, setFiltroElemento] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [horasEditadas, setHorasEditadas] = useState("");
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const filtrado = useMemo(() => {
    return historial.filter((h) => {
      if (filtroEmpleado && h.employeeId !== filtroEmpleado) return false;
      if (filtroElemento && h.elementId !== filtroElemento) return false;
      const fecha = h.date.slice(0, 10);
      if (fechaDesde && fecha < fechaDesde) return false;
      if (fechaHasta && fecha > fechaHasta) return false;
      return true;
    });
  }, [historial, filtroEmpleado, filtroElemento, fechaDesde, fechaHasta]);

  const secciones: SeccionFiltroConfig[] = [
    {
      tipo: "select",
      titulo: "Empleado",
      opciones: [{ label: "Todos", value: "" }, ...empleados.map((e) => ({ label: e.name, value: e.employeeId }))],
      valor: filtroEmpleado,
      onCambio: setFiltroEmpleado,
    },
    {
      tipo: "select",
      titulo: "Elemento",
      opciones: [{ label: "Todos", value: "" }, ...elementos.map((e) => ({ label: e.code, value: e.id }))],
      valor: filtroElemento,
      onCambio: setFiltroElemento,
    },
  ];

  function limpiarFiltros() {
    setFiltroEmpleado("");
    setFiltroElemento("");
    setFechaDesde("");
    setFechaHasta("");
  }

  function abrirEdicion(h: TimeEntryHistorialDTO) {
    setEditandoId(h.id);
    setHorasEditadas(String(h.hours));
  }

  async function guardarEdicion(id: string) {
    const horas = parseFloat(horasEditadas);
    if (!Number.isFinite(horas) || horas <= 0 || horas > 24) {
      toast.error("Las horas deben ser mayores a 0 y no más de 24.");
      return;
    }
    setCargando(true);
    const result = await actualizarTimeEntryAction(id, clienteId, horas);
    setCargando(false);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo actualizar.");
      return;
    }
    toast.success("Horas actualizadas");
    setEditandoId(null);
    router.refresh();
  }

  async function eliminar(id: string) {
    setCargando(true);
    const result = await eliminarTimeEntryAction(id, clienteId);
    setCargando(false);
    setConfirmandoId(null);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo eliminar.");
      return;
    }
    toast.success("Registro eliminado");
    router.refresh();
  }

  const totalHoras = filtrado.reduce((acc, h) => acc + h.hours, 0);
  const totalCosto = filtrado.reduce((acc, h) => acc + h.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">Historial de horas capturadas</p>
        <div className="flex items-center gap-2">
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs" />
          <span className="text-xs text-zinc-400">a</span>
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs" />
          <PanelFiltros secciones={secciones} onLimpiar={limpiarFiltros} />
        </div>
      </div>

      <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
        {filtrado.length === 0 ? (
          <div className="px-4 py-2">
            <EmptyState icon="IconClock" title="Sin registros" description="No hay horas capturadas que coincidan con el filtro." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Empleado</th>
                  <th className="px-3 py-2.5">Elemento</th>
                  <th className="px-3 py-2.5">Horas</th>
                  <th className="px-3 py-2.5">Costo/h</th>
                  <th className="px-3 py-2.5">Importe</th>
                  <th className="px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtrado.map((h) => (
                  <tr key={h.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                    <td className="px-3 py-2 text-zinc-600">{formatFecha(h.date)}</td>
                    <td className="px-3 py-2 text-zinc-800">{h.employeeName}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-500">{h.elementCode ?? "—"}</td>
                    <td className="px-3 py-2">
                      {editandoId === h.id ? (
                        <input
                          type="number"
                          min="0.5"
                          max="24"
                          step="0.5"
                          value={horasEditadas}
                          onChange={(e) => setHorasEditadas(e.target.value)}
                          className="w-16 rounded border border-zinc-300 px-1.5 py-0.5 text-sm"
                          autoFocus
                        />
                      ) : (
                        <span className="text-zinc-600">{h.hours}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{formatImporte(h.hourlyCost, "MXN")}</td>
                    <td className="px-3 py-2 text-zinc-600">{formatImporte(h.amount, "MXN")}</td>
                    <td className="px-3 py-2 text-right">
                      {confirmandoId === h.id ? (
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <span className="text-zinc-500">¿Eliminar?</span>
                          <button type="button" disabled={cargando} onClick={() => eliminar(h.id)} className="font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">Sí</button>
                          <button type="button" onClick={() => setConfirmandoId(null)} className="text-zinc-400 hover:text-zinc-600">No</button>
                        </div>
                      ) : editandoId === h.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" disabled={cargando} onClick={() => guardarEdicion(h.id)} className="rounded p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-50">
                            <IconCheck className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setEditandoId(null)} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100">
                            <IconX className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {permiso.editar && (
                            <button type="button" onClick={() => abrirEdicion(h)} title="Editar" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                              <IconPencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {permiso.eliminar && (
                            <button type="button" onClick={() => setConfirmandoId(h.id)} title="Eliminar" className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600">
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-surface-muted text-xs font-semibold text-zinc-700">
                  <td className="px-3 py-2.5" colSpan={3}>Totales del periodo filtrado</td>
                  <td className="px-3 py-2.5">{totalHoras.toFixed(1)} h</td>
                  <td className="px-3 py-2.5"></td>
                  <td className="px-3 py-2.5">{formatImporte(totalCosto, "MXN")}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
