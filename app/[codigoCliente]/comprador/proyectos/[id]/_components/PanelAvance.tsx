"use client";

import { calcularElementProgressPct } from "@/src/lib/capturaTypes";

export type EtapaEditable = {
  stageId: string;
  code: string;
  name: string;
  weightPct: number;
  order: number;
  qtyAnterior: number;
  qtyNuevo: number;
};

export default function PanelAvance({
  etapas,
  qty,
  onCambiarQty,
}: {
  etapas: EtapaEditable[];
  qty: number;
  onCambiarQty: (stageId: string, value: string) => void;
}) {
  const pctAnterior = calcularElementProgressPct(qty, etapas.map((e) => ({ weightPct: e.weightPct, qtyDone: e.qtyAnterior })));
  const pctNuevo = calcularElementProgressPct(qty, etapas.map((e) => ({ weightPct: e.weightPct, qtyDone: e.qtyNuevo })));

  const INPUT =
    "w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";

  return (
    <div className="rounded-card border border-border bg-white p-4 shadow-card space-y-3">
      <h3 className="text-sm font-semibold text-zinc-900">Avance</h3>

      <div className="space-y-2">
        {etapas.map((e) => (
          <div key={e.stageId} className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 px-3 py-2">
            <span className="text-sm text-zinc-700">{e.name}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max={qty}
                step="1"
                value={e.qtyNuevo}
                onChange={(ev) => onCambiarQty(e.stageId, ev.target.value)}
                className={INPUT}
              />
              <span className="text-xs text-zinc-400">/ {qty}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
        <div className="text-xs text-zinc-500">
          Avance anterior: <span className="font-semibold text-zinc-600">{pctAnterior.toFixed(1)}%</span>
        </div>
        <div className="text-sm font-semibold text-primary">
          Avance nuevo: {pctNuevo.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
