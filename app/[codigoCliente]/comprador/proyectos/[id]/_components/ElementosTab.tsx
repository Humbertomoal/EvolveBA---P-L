"use client";

import { useRouter } from "next/navigation";
import { IconArrowRight } from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { ElementoConAvanceDTO } from "@/src/lib/getCaptura";
import type { PartidaSelectDTO } from "@/src/lib/getPresupuesto";
import type { PermisoModulo } from "@/src/lib/permisos";
import { asignarElementoPartidaAction } from "@/src/lib/presupuestoActions";
import { formatImporte } from "@/src/lib/monedas";
import EmptyState from "@/src/components/EmptyState";

function BarraProgreso({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full ${clamped >= 100 ? "bg-green-500" : "bg-primary"}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-xs text-zinc-600">{pct.toFixed(1)}%</span>
    </div>
  );
}

export default function ElementosTab({
  elementos,
  avanceProyecto,
  partidas,
  permisoCaptura,
  permisoPresupuesto,
  clienteId,
  onIrACaptura,
}: {
  elementos: ElementoConAvanceDTO[];
  avanceProyecto: number;
  partidas: PartidaSelectDTO[];
  permisoCaptura: PermisoModulo;
  permisoPresupuesto: PermisoModulo;
  clienteId: string;
  onIrACaptura: (elementId: string) => void;
}) {
  const router = useRouter();
  const totalHoras = elementos.reduce((acc, e) => acc + e.horasAcumuladas, 0);
  const totalCostoMo = elementos.reduce((acc, e) => acc + e.costoMoAcumulado, 0);

  async function handleCambiarPartida(elementId: string, budgetItemId: string) {
    const result = await asignarElementoPartidaAction(elementId, clienteId, budgetItemId || null);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo asignar la partida.");
      return;
    }
    toast.success("Partida asignada");
    router.refresh();
  }

  if (elementos.length === 0) {
    return (
      <EmptyState
        icon="IconRuler2"
        title="Sin elementos en este proyecto"
        description="Agrega elementos desde el formulario de edición del proyecto."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                <th className="px-3 py-2.5">Código</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5">Cant</th>
                <th className="px-3 py-2.5">Peso</th>
                <th className="px-3 py-2.5">Partida</th>
                <th className="px-3 py-2.5">Avance por etapa</th>
                <th className="px-3 py-2.5">Avance %</th>
                <th className="px-3 py-2.5">h-h acum.</th>
                <th className="px-3 py-2.5">Costo MO acum.</th>
                {permisoCaptura.crear && <th className="px-3 py-2.5 text-right">Captura</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {elementos.map((e) => (
                <tr key={e.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                  <td className="px-3 py-2.5 font-mono text-xs text-zinc-500">{e.code}</td>
                  <td className="px-3 py-2.5 text-zinc-700">{e.name}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{e.qty}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{e.weight.toFixed(2)} kg</td>
                  <td className="px-3 py-2.5">
                    {permisoPresupuesto.editar ? (
                      <select
                        defaultValue={e.budgetItemId ?? ""}
                        onChange={(ev) => handleCambiarPartida(e.id, ev.target.value)}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400"
                      >
                        <option value="">Sin partida</option>
                        {partidas.map((p) => (
                          <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-zinc-500">
                        {partidas.find((p) => p.id === e.budgetItemId)?.name ?? "Sin partida"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-zinc-500">
                      {e.etapas.map((et) => (
                        <span key={et.stageId}>
                          {et.name}: <span className="font-medium text-zinc-700">{et.qtyDone}</span>/{e.qty}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <BarraProgreso pct={e.progressPct} />
                  </td>
                  <td className="px-3 py-2.5 text-zinc-600">{e.horasAcumuladas.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{formatImporte(e.costoMoAcumulado, "MXN")}</td>
                  {permisoCaptura.crear && (
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onIrACaptura(e.id)}
                        title="Ir a captura"
                        className="inline-flex items-center gap-1 rounded p-1.5 text-zinc-400 hover:bg-primary/10 hover:text-primary transition-colors duration-150"
                      >
                        <IconArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-surface-muted text-xs font-semibold text-zinc-700">
                <td className="px-3 py-2.5" colSpan={6}>Avance total del proyecto</td>
                <td className="px-3 py-2.5">
                  <BarraProgreso pct={avanceProyecto} />
                </td>
                <td className="px-3 py-2.5">{totalHoras.toFixed(1)}</td>
                <td className="px-3 py-2.5">{formatImporte(totalCostoMo, "MXN")}</td>
                {permisoCaptura.crear && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
