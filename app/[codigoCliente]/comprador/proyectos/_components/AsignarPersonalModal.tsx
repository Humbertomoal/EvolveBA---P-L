"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { EmpleadoParaAsignarDTO } from "@/src/lib/proyectosTypes";
import type { CuadrillaDTO } from "@/src/lib/personalTypes";
import { formatImporte } from "@/src/lib/monedas";

/**
 * Selector puro de personal: no persiste nada por sí mismo. Recibe la
 * selección inicial y devuelve la selección final vía onAceptar — el llamador
 * decide qué hacer con ella (guardar en estado local del formulario, o
 * sincronizar contra la BD). Se reutiliza tal cual en ProyectoForm (nuevo y
 * editar) y en PersonalTab (gestión rápida del detalle).
 */
export default function AsignarPersonalModal({
  disponibles,
  cuadrillas,
  seleccionInicial,
  onCerrar,
  onAceptar,
}: {
  disponibles: EmpleadoParaAsignarDTO[];
  cuadrillas: CuadrillaDTO[];
  seleccionInicial: string[];
  onCerrar: () => void;
  onAceptar: (employeeIds: string[]) => void;
}) {
  const [seleccionCuadrilla, setSeleccionCuadrilla] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(() => new Set(seleccionInicial));

  const roles = useMemo(() => {
    const unicos = new Set(disponibles.map((e) => e.role).filter((r): r is string => !!r));
    return Array.from(unicos).sort((a, b) => a.localeCompare(b));
  }, [disponibles]);

  const visibles = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase();
    return disponibles.filter((e) => {
      if (filtroRol && e.role !== filtroRol) return false;
      if (texto && !e.name.toLowerCase().includes(texto) && !(e.code ?? "").toLowerCase().includes(texto)) {
        return false;
      }
      return true;
    });
  }, [disponibles, filtroRol, filtroTexto]);

  const grupos = useMemo(() => {
    const porGrupo = new Map<string, EmpleadoParaAsignarDTO[]>();
    for (const e of visibles) {
      const grupo = e.crewNombre ?? "Sin cuadrilla";
      if (!porGrupo.has(grupo)) porGrupo.set(grupo, []);
      porGrupo.get(grupo)!.push(e);
    }
    return Array.from(porGrupo.entries()).sort(([a], [b]) => {
      if (a === "Sin cuadrilla") return 1;
      if (b === "Sin cuadrilla") return -1;
      return a.localeCompare(b);
    });
  }, [visibles]);

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

  function toggle(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function seleccionarTodosVisibles() {
    setSeleccionados((prev) => new Set([...prev, ...visibles.map((e) => e.id)]));
  }

  function deseleccionarTodosVisibles() {
    const visiblesIds = new Set(visibles.map((e) => e.id));
    setSeleccionados((prev) => new Set([...prev].filter((id) => !visiblesIds.has(id))));
  }

  const INPUT =
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white p-6 shadow-xl">
        <h2 className="shrink-0 text-base font-semibold text-zinc-900">Asignar cuadrilla / personal</h2>

        <div className="mt-4 grid shrink-0 grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Cuadrilla completa</label>
            <select value={seleccionCuadrilla} onChange={(e) => handleCuadrillaChange(e.target.value)} className={INPUT}>
              <option value="">Elegir cuadrilla...</option>
              {cuadrillas.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.leaderNombre})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Filtrar por rol</label>
            <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} className={INPUT}>
              <option value="">Todos</option>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Buscar</label>
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Nombre o código..."
              className={INPUT}
            />
          </div>
        </div>

        <p className="mt-1 shrink-0 text-xs text-zinc-400">
          Elegir una cuadrilla marca al jefe y a todos sus integrantes. Puedes desmarcar o agregar gente suelta abajo.
        </p>

        <div className="mt-3 flex shrink-0 items-center justify-between border-t border-zinc-100 pt-3">
          <div className="flex gap-2">
            <button type="button" onClick={seleccionarTodosVisibles} className="text-xs font-medium text-primary hover:underline">
              Seleccionar todos
            </button>
            <span className="text-xs text-zinc-300">·</span>
            <button type="button" onClick={deseleccionarTodosVisibles} className="text-xs font-medium text-zinc-500 hover:underline">
              Deseleccionar todos
            </button>
          </div>
          <span className="text-xs font-medium text-zinc-600">
            {seleccionados.size} empleado{seleccionados.size !== 1 ? "s" : ""} seleccionado{seleccionados.size !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto">
          {grupos.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">Sin empleados que coincidan con el filtro.</p>
          ) : (
            grupos.map(([grupo, empleados]) => (
              <div key={grupo} className="mb-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">{grupo}</p>
                <div className="flex flex-col gap-1">
                  {empleados.map((e) => (
                    <label
                      key={e.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      <input
                        type="checkbox"
                        checked={seleccionados.has(e.id)}
                        onChange={() => toggle(e.id)}
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                      <span className="flex-1">
                        {e.name}
                        {e.isLeader ? " (jefe)" : ""}
                      </span>
                      <span className="text-xs text-zinc-400">{e.role ?? "—"}</span>
                      <span className="w-20 text-right text-xs text-zinc-400">{formatImporte(e.hourlyCost, "MXN")}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-zinc-100 pt-4">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onAceptar(Array.from(seleccionados))}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-dark"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
