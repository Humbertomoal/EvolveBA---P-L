"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { EmpleadoParaAsignarDTO } from "@/src/lib/proyectosTypes";
import type { CuadrillaDTO } from "@/src/lib/personalTypes";
import { asignarPersonalAction } from "@/src/lib/proyectosActions";

const SIN_CUADRILLA = "__sin__";

export default function AsignarPersonalModal({
  projectId,
  clienteId,
  disponibles,
  cuadrillas,
  onCerrar,
  onGuardado,
}: {
  projectId: string;
  clienteId: string;
  disponibles: EmpleadoParaAsignarDTO[];
  cuadrillas: CuadrillaDTO[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [seleccionCuadrilla, setSeleccionCuadrilla] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(
    () => new Set(disponibles.filter((e) => e.yaAsignado).map((e) => e.id))
  );
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grupos = useMemo(() => {
    const porGrupo = new Map<string, EmpleadoParaAsignarDTO[]>();
    for (const e of disponibles) {
      const grupo = e.crewNombre ?? "Sin cuadrilla";
      if (!porGrupo.has(grupo)) porGrupo.set(grupo, []);
      porGrupo.get(grupo)!.push(e);
    }
    return Array.from(porGrupo.entries()).sort(([a], [b]) => {
      if (a === "Sin cuadrilla") return 1;
      if (b === "Sin cuadrilla") return -1;
      return a.localeCompare(b);
    });
  }, [disponibles]);

  function handleCuadrillaChange(crewId: string) {
    setSeleccionCuadrilla(crewId);
    if (!crewId) return;

    const cuadrilla = cuadrillas.find((c) => c.id === crewId);
    if (!cuadrilla) return;

    const idsDeLaCuadrilla = disponibles
      .filter((e) => e.crewId === crewId || e.id === cuadrilla.leaderId)
      .map((e) => e.id);

    setSeleccionados((prev) => new Set([...prev, ...idsDeLaCuadrilla]));
  }

  function toggle(id: string, yaAsignado: boolean) {
    if (yaAsignado) return;
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGuardar() {
    setCargando(true);
    setError(null);
    const result = await asignarPersonalAction(projectId, clienteId, Array.from(seleccionados));
    setCargando(false);
    if (!result.ok) {
      setError(result.error ?? "Error al asignar personal.");
      toast.error(result.error ?? "No se pudo asignar el personal.");
      return;
    }
    toast.success("Personal asignado correctamente");
    onGuardado();
  }

  const INPUT =
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white p-6 shadow-xl">
        <h2 className="shrink-0 text-base font-semibold text-zinc-900">Asignar personal</h2>

        <div className="mt-4 shrink-0">
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Seleccionar cuadrilla completa
          </label>
          <select
            value={seleccionCuadrilla}
            onChange={(e) => handleCuadrillaChange(e.target.value)}
            className={INPUT}
          >
            <option value="">Elegir cuadrilla...</option>
            {cuadrillas.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.leaderNombre})</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-400">
            Marca al jefe y a todos sus integrantes. Puedes desmarcar o agregar gente suelta abajo.
          </p>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto border-t border-zinc-100 pt-3">
          {grupos.map(([grupo, empleados]) => (
            <div key={grupo} className="mb-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">{grupo}</p>
              <div className="flex flex-col gap-1">
                {empleados.map((e) => (
                  <label
                    key={e.id}
                    className={`flex items-center gap-2 rounded px-1.5 py-1 text-sm ${
                      e.yaAsignado ? "text-zinc-400" : "cursor-pointer text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={seleccionados.has(e.id)}
                      disabled={e.yaAsignado}
                      onChange={() => toggle(e.id, e.yaAsignado)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    <span className="flex-1">
                      {e.name}
                      {e.role ? ` · ${e.role}` : ""}
                      {e.isLeader ? " (jefe)" : ""}
                    </span>
                    {e.yaAsignado && <span className="text-xs text-zinc-400">ya asignado</span>}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="mt-2 shrink-0 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-zinc-100 pt-4">
          <button
            type="button"
            onClick={onCerrar}
            disabled={cargando}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={cargando}
            className="rounded-md bg-[var(--color-primario)] px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--color-secundario)] disabled:opacity-50"
          >
            {cargando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
