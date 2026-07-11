"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconUserMinus, IconUserPlus } from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { CuadrillaDetalleDTO, EmpleadoDTO } from "@/src/lib/personalTypes";
import { agregarIntegranteAction, quitarIntegranteAction } from "@/src/lib/personalActions";
import { usePageTitle } from "@/app/_components/PageHeaderContext";
import EmptyState from "@/src/components/EmptyState";

export default function CuadrillaDetalleView({
  cuadrilla,
  empleadosDisponibles,
  basePath,
}: {
  cuadrilla: CuadrillaDetalleDTO;
  empleadosDisponibles: EmpleadoDTO[];
  basePath: string;
}) {
  const router = useRouter();
  usePageTitle(`Cuadrilla · ${cuadrilla.name}`);

  const [empleadoAAgregar, setEmpleadoAAgregar] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleAgregar() {
    if (!empleadoAAgregar) return;
    setCargando(true);
    const result = await agregarIntegranteAction(cuadrilla.id, empleadoAAgregar);
    setCargando(false);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo agregar el integrante.");
      return;
    }
    toast.success("Integrante agregado");
    setEmpleadoAAgregar("");
    router.refresh();
  }

  async function handleQuitar(employeeId: string) {
    setCargando(true);
    await quitarIntegranteAction(employeeId);
    setCargando(false);
    toast.success("Integrante removido de la cuadrilla");
    router.refresh();
  }

  const INPUT =
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href={`${basePath}/comprador/personal/cuadrillas`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <IconArrowLeft className="h-4 w-4" />
        Volver a cuadrillas
      </Link>

      <div className="rounded-card border border-border bg-white p-5 shadow-card">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Jefe de cuadrilla</p>
        <p className="mt-1 text-sm font-medium text-zinc-800">{cuadrilla.leaderNombre}</p>
        <span
          className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cuadrilla.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}
        >
          {cuadrilla.active ? "Activa" : "Inactiva"}
        </span>
      </div>

      <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
          <span className="text-sm font-medium text-zinc-700">
            Integrantes
            <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-500">
              {cuadrilla.miembros.length}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
          <select
            value={empleadoAAgregar}
            onChange={(e) => setEmpleadoAAgregar(e.target.value)}
            className={INPUT}
          >
            <option value="">Seleccionar empleado disponible...</option>
            {empleadosDisponibles.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}{e.role ? ` · ${e.role}` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAgregar}
            disabled={!empleadoAAgregar || cargando}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--color-primario)] px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--color-secundario)] disabled:opacity-50"
          >
            <IconUserPlus className="h-4 w-4" />
            Agregar
          </button>
        </div>

        {cuadrilla.miembros.length === 0 ? (
          <div className="px-4 py-2">
            <EmptyState
              icon="IconUsersGroup"
              title="Sin integrantes"
              description="Agrega empleados disponibles (activos y sin cuadrilla) a esta cuadrilla."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                  <th className="px-4 py-2.5">Código</th>
                  <th className="px-4 py-2.5">Nombre</th>
                  <th className="px-4 py-2.5">Rol</th>
                  <th className="px-4 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {cuadrilla.miembros.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{m.code ?? "—"}</td>
                    <td className="px-4 py-2.5 text-zinc-800">{m.name}</td>
                    <td className="px-4 py-2.5 text-zinc-600">{m.role ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={cargando}
                        onClick={() => handleQuitar(m.id)}
                        title="Quitar de la cuadrilla"
                        className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors duration-150 disabled:opacity-50"
                      >
                        <IconUserMinus className="h-3.5 w-3.5" />
                      </button>
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
