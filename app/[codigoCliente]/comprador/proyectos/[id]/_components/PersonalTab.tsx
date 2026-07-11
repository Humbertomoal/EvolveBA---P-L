"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconUserMinus, IconUserPlus } from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { EmpleadoAsignadoDTO, EmpleadoParaAsignarDTO } from "@/src/lib/proyectosTypes";
import type { CuadrillaDTO } from "@/src/lib/personalTypes";
import type { PermisoModulo } from "@/src/lib/permisos";
import { quitarAsignacionAction, sincronizarAsignacionesAction } from "@/src/lib/proyectosActions";
import { formatImporte } from "@/src/lib/monedas";
import EmptyState from "@/src/components/EmptyState";
import AsignarPersonalModal from "../../_components/AsignarPersonalModal";

export default function PersonalTab({
  projectId,
  asignados,
  disponibles,
  cuadrillas,
  permiso,
  clienteId,
}: {
  projectId: string;
  asignados: EmpleadoAsignadoDTO[];
  disponibles: EmpleadoParaAsignarDTO[];
  cuadrillas: CuadrillaDTO[];
  permiso: PermisoModulo;
  clienteId: string;
}) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState<string | null>(null);

  async function handleQuitar(assignmentId: string) {
    setCargando(assignmentId);
    const result = await quitarAsignacionAction(assignmentId, clienteId);
    setCargando(null);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo quitar la asignación.");
      return;
    }
    toast.success("Empleado removido del proyecto");
    router.refresh();
  }

  async function handleAceptarModal(employeeIds: string[]) {
    const result = await sincronizarAsignacionesAction(projectId, clienteId, employeeIds);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo actualizar el personal asignado.");
      return;
    }
    toast.success("Personal asignado correctamente");
    setModalAbierto(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">Empleados asignados a este proyecto</p>
        {permiso.editar && (
          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-1.5 rounded-md bg-[var(--color-primario)] px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--color-secundario)]"
          >
            <IconUserPlus className="h-4 w-4" />
            Asignar personal
          </button>
        )}
      </div>

      <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
        {asignados.length === 0 ? (
          <div className="px-4 py-2">
            <EmptyState
              icon="IconUsers"
              title="Sin personal asignado"
              description="Asigna empleados de tus cuadrillas a este proyecto."
              actionLabel={permiso.editar ? "Asignar personal" : undefined}
              onAction={permiso.editar ? () => setModalAbierto(true) : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Cuadrilla</th>
                  <th className="px-4 py-3">Costo/hora</th>
                  {permiso.editar && <th className="px-4 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {asignados.map((a) => (
                  <tr key={a.assignmentId} className="hover:bg-zinc-50/50 transition-colors duration-150">
                    <td className="px-4 py-3 font-medium text-zinc-800">{a.name}</td>
                    <td className="px-4 py-3 text-zinc-600">{a.role ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{a.crewNombre ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatImporte(a.hourlyCost, "MXN")}</td>
                    {permiso.editar && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={cargando === a.assignmentId}
                          onClick={() => handleQuitar(a.assignmentId)}
                          title="Quitar del proyecto"
                          className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors duration-150 disabled:opacity-50"
                        >
                          <IconUserMinus className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbierto && (
        <AsignarPersonalModal
          disponibles={disponibles}
          cuadrillas={cuadrillas}
          seleccionInicial={asignados.map((a) => a.employeeId)}
          onCerrar={() => setModalAbierto(false)}
          onAceptar={handleAceptarModal}
        />
      )}
    </div>
  );
}
