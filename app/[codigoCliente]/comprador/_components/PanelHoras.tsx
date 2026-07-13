"use client";

import type { CuadrillaDTO } from "@/src/lib/personalTypes";
import type { EmpleadoCapturaDTO } from "@/src/lib/capturaTypes";
import { formatImporte } from "@/src/lib/monedas";

export default function PanelHoras({
  empleados,
  cuadrillas,
  horasParaTodos,
  onCuadrillaChange,
  onHorasParaTodosChange,
  onToggleMarcado,
  onHorasIndividualChange,
}: {
  empleados: EmpleadoCapturaDTO[];
  cuadrillas: CuadrillaDTO[];
  horasParaTodos: string;
  onCuadrillaChange: (crewId: string) => void;
  onHorasParaTodosChange: (value: string) => void;
  onToggleMarcado: (employeeId: string) => void;
  onHorasIndividualChange: (employeeId: string, value: string) => void;
}) {
  const marcados = empleados.filter((e) => e.marcado);
  const totalHoras = marcados.reduce((acc, e) => acc + e.horas, 0);
  const totalCosto = marcados.reduce((acc, e) => acc + e.horas * e.hourlyCost, 0);

  const INPUT =
    "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";

  return (
    <div className="rounded-card border border-border bg-white p-4 shadow-card space-y-3">
      <h3 className="text-sm font-semibold text-zinc-900">Horas</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Cuadrilla (atajo)</label>
          <select defaultValue="" onChange={(e) => onCuadrillaChange(e.target.value)} className={INPUT}>
            <option value="">Elegir cuadrilla...</option>
            {cuadrillas.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Horas para todos</label>
          <input
            type="number"
            min="0.5"
            max="24"
            step="0.5"
            value={horasParaTodos}
            onChange={(e) => onHorasParaTodosChange(e.target.value)}
            className={INPUT}
          />
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
              <th className="w-8 px-2 py-2"></th>
              <th className="px-2 py-2">Nombre</th>
              <th className="px-2 py-2">Rol</th>
              <th className="w-20 px-2 py-2">Horas</th>
              <th className="px-2 py-2">Costo/h</th>
              <th className="px-2 py-2">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {empleados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-xs text-zinc-400">
                  No hay empleados asignados a este proyecto.
                </td>
              </tr>
            ) : (
              empleados.map((e) => (
                <tr key={e.employeeId} className={e.marcado ? "bg-primary/5" : ""}>
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={e.marcado}
                      onChange={() => onToggleMarcado(e.employeeId)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-zinc-800">{e.name}</td>
                  <td className="px-2 py-1.5 text-xs text-zinc-500">{e.role ?? "—"}</td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min="0.5"
                      max="24"
                      step="0.5"
                      disabled={!e.marcado}
                      value={e.horas}
                      onChange={(ev) => onHorasIndividualChange(e.employeeId, ev.target.value)}
                      className={`${INPUT} disabled:bg-zinc-50 disabled:text-zinc-400`}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-xs text-zinc-500">{formatImporte(e.hourlyCost, "MXN")}</td>
                  <td className="px-2 py-1.5 text-xs text-zinc-500">
                    {e.marcado ? formatImporte(e.horas * e.hourlyCost, "MXN") : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs font-semibold text-zinc-700">
        <span>Total h-h: {totalHoras.toFixed(1)}</span>
        <span>Costo total MO del día: {formatImporte(totalCosto, "MXN")}</span>
      </div>
    </div>
  );
}
