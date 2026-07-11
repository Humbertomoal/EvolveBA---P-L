"use client";

import { IconRefresh, IconTrash } from "@tabler/icons-react";
import { calcularCostoSugerido, calcularPesoUnitario } from "@/src/lib/elementTypesTypes";
import { formatImporte } from "@/src/lib/monedas";

export type FilaElementoProyecto = {
  clientKey: string;
  elementId?: string;
  elementTypeId: string;
  elementTypeName: string;
  elementTypeFamily: string;
  weightUnit: string;
  weightValueCatalogo: number;
  priceUnit: string;
  estimatedPriceCatalogo: number;
  code: string;
  qty: number;
  length: number | null;
  unitCost: number;
  costoSobrescrito: boolean;
};

const INPUT_SM =
  "w-full rounded-md border border-zinc-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";

function pesoUnit(fila: FilaElementoProyecto): number {
  return calcularPesoUnitario(fila.weightUnit, fila.weightValueCatalogo, fila.length);
}

function costoSugerido(fila: FilaElementoProyecto): number {
  return calcularCostoSugerido(fila.priceUnit, fila.estimatedPriceCatalogo, pesoUnit(fila), fila.length);
}

export default function ElementosProyectoTable({
  filas,
  onCambiarFila,
  onQuitarFila,
}: {
  filas: FilaElementoProyecto[];
  onCambiarFila: (clientKey: string, patch: Partial<FilaElementoProyecto>) => void;
  onQuitarFila: (clientKey: string) => void;
}) {
  function handleLargoChange(fila: FilaElementoProyecto, largoStr: string) {
    const largo = largoStr === "" ? null : parseFloat(largoStr);
    const patch: Partial<FilaElementoProyecto> = { length: Number.isFinite(largo) ? largo : null };
    if (!fila.costoSobrescrito) {
      const nuevaFila = { ...fila, ...patch };
      patch.unitCost = costoSugerido(nuevaFila);
    }
    onCambiarFila(fila.clientKey, patch);
  }

  function handleUnitCostChange(fila: FilaElementoProyecto, valorStr: string) {
    const valor = parseFloat(valorStr);
    onCambiarFila(fila.clientKey, { unitCost: Number.isFinite(valor) ? valor : 0, costoSobrescrito: true });
  }

  function handleRecalcular(fila: FilaElementoProyecto) {
    onCambiarFila(fila.clientKey, { unitCost: costoSugerido(fila), costoSobrescrito: false });
  }

  const pesoTotalObra = filas.reduce((acc, f) => acc + pesoUnit(f) * f.qty, 0);
  const costoTotalObra = filas.reduce((acc, f) => acc + f.unitCost * f.qty, 0);

  if (filas.length === 0) {
    return <p className="text-sm text-zinc-400">Sin elementos agregados todavía.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-zinc-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
            <th className="px-2 py-2">Código obra</th>
            <th className="px-2 py-2">Tipo</th>
            <th className="w-16 px-2 py-2">Cant</th>
            <th className="w-24 px-2 py-2">Largo (m)</th>
            <th className="px-2 py-2">Peso unit</th>
            <th className="px-2 py-2">Peso total</th>
            <th className="w-28 px-2 py-2">Costo unit</th>
            <th className="px-2 py-2">Costo total</th>
            <th className="w-8 px-2 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {filas.map((fila) => {
            const largoAplica = fila.weightUnit === "KG_M";
            const pu = pesoUnit(fila);
            const ct = fila.unitCost * fila.qty;
            return (
              <tr key={fila.clientKey}>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={fila.code}
                    onChange={(e) => onCambiarFila(fila.clientKey, { code: e.target.value })}
                    className={INPUT_SM}
                  />
                </td>
                <td className="px-2 py-1.5 text-xs text-zinc-600">
                  {fila.elementTypeName}
                  <span className="block text-zinc-400">{fila.elementTypeFamily}</span>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={fila.qty}
                    onChange={(e) => onCambiarFila(fila.clientKey, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className={INPUT_SM}
                  />
                </td>
                <td className="px-2 py-1.5">
                  {largoAplica ? (
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={fila.length ?? ""}
                      onChange={(e) => handleLargoChange(fila, e.target.value)}
                      className={INPUT_SM}
                    />
                  ) : (
                    <span className="text-xs text-zinc-400">N/A</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-xs text-zinc-600">{pu.toFixed(3)} kg</td>
                <td className="px-2 py-1.5 text-xs text-zinc-600">{(pu * fila.qty).toFixed(3)} kg</td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={fila.unitCost}
                      onChange={(e) => handleUnitCostChange(fila, e.target.value)}
                      className={`${INPUT_SM} ${fila.costoSobrescrito ? "border-amber-400 bg-amber-50" : ""}`}
                      title={fila.costoSobrescrito ? "Costo sobrescrito manualmente — ya no sigue al catálogo" : undefined}
                    />
                    {fila.costoSobrescrito && (
                      <button
                        type="button"
                        onClick={() => handleRecalcular(fila)}
                        title="Recalcular desde catálogo"
                        className="shrink-0 rounded p-1 text-amber-600 hover:bg-amber-100"
                      >
                        <IconRefresh className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-2 py-1.5 text-xs text-zinc-600">{formatImporte(ct, "MXN")}</td>
                <td className="px-2 py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => onQuitarFila(fila.clientKey)}
                    title="Quitar"
                    className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-surface-muted text-xs font-semibold text-zinc-700">
            <td className="px-2 py-2" colSpan={5}>Totales</td>
            <td className="px-2 py-2">
              {pesoTotalObra.toLocaleString("es-MX", { maximumFractionDigits: 1 })} kg
              {pesoTotalObra >= 1000 && ` (${(pesoTotalObra / 1000).toLocaleString("es-MX", { maximumFractionDigits: 2 })} ton)`}
            </td>
            <td className="px-2 py-2"></td>
            <td className="px-2 py-2">{formatImporte(costoTotalObra, "MXN")}</td>
            <td className="px-2 py-2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
