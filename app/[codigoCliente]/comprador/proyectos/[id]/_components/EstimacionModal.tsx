"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import type { EstimacionDTO, EstimacionFormInput, EstimacionPreviewDTO } from "@/src/lib/estimacionesTypes";
import { previsualizarEstimacionAction, crearEstimacionAction, actualizarEstimacionAction } from "@/src/lib/estimacionesActions";
import { formatImporte } from "@/src/lib/monedas";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Default para una estimación nueva: el mes calendario actual completo (mismo
// formato que el ejemplo del enunciado, "01-31 Jul 2026") — evita que
// periodStart y periodEnd nazcan iguales (inválido: periodStart < periodEnd).
function primerDiaMes(): string {
  const d = new Date();
  return iso(new Date(d.getFullYear(), d.getMonth(), 1));
}

function ultimoDiaMes(): string {
  const d = new Date();
  return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export default function EstimacionModal({
  projectId,
  clienteId,
  editando,
  onCerrar,
  onGuardado,
}: {
  projectId: string;
  clienteId: string;
  editando: EstimacionDTO | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [periodStart, setPeriodStart] = useState(editando ? editando.periodStart.slice(0, 10) : primerDiaMes());
  const [periodEnd, setPeriodEnd] = useState(editando ? editando.periodEnd.slice(0, 10) : ultimoDiaMes());
  const [sobrescribir, setSobrescribir] = useState(editando?.grossAmountManual ?? false);
  const [brutoManual, setBrutoManual] = useState(editando?.grossAmount ?? 0);

  const [preview, setPreview] = useState<EstimacionPreviewDTO | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setCargandoPreview(true);
      const datos: EstimacionFormInput = {
        periodStart,
        periodEnd,
        grossAmountOverride: sobrescribir ? brutoManual : null,
      };
      const result = await previsualizarEstimacionAction(projectId, clienteId, datos, editando?.id);
      if (requestId !== requestIdRef.current) return;
      setCargandoPreview(false);
      if (!result.ok || !result.data) {
        setPreview(null);
        setPreviewError(result.error ?? "No se pudo calcular la estimación.");
        return;
      }
      setPreviewError(null);
      setPreview(result.data);
    }, 300);
    return () => clearTimeout(timer);
  }, [projectId, clienteId, periodStart, periodEnd, sobrescribir, brutoManual, editando?.id]);

  async function handleGuardar() {
    if (!preview || previewError) return;
    setGuardando(true);
    const datos: EstimacionFormInput = {
      periodStart,
      periodEnd,
      grossAmountOverride: sobrescribir ? brutoManual : null,
    };
    const result = editando
      ? await actualizarEstimacionAction(editando.id, clienteId, datos)
      : await crearEstimacionAction(projectId, clienteId, datos);
    setGuardando(false);

    if (!result.ok) {
      toast.error(result.error ?? "No se pudo guardar la estimación.");
      return;
    }
    if (result.warning) toast(result.warning, { icon: "⚠️" });
    toast.success(editando ? "Estimación actualizada correctamente" : "Estimación creada correctamente");
    onGuardado();
  }

  const INPUT =
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-zinc-900">
          {editando ? `Editar estimación #${editando.number}` : "Nueva estimación"}
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Periodo desde <span className="text-red-500">*</span></label>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Periodo hasta <span className="text-red-500">*</span></label>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={INPUT} />
          </div>
        </div>

        <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-4">
          {cargandoPreview && !preview ? (
            <p className="text-sm text-zinc-400">Calculando…</p>
          ) : previewError ? (
            <p className="text-sm text-red-600">{previewError}</p>
          ) : preview ? (
            <div className="space-y-2 text-sm">
              <Fila label="Avance acumulado" valor={`${preview.progressPct}%`} nota="Calculado desde los elementos, no editable" />
              <Fila label="Avance anterior" valor={`${preview.avanceAnterior}%`} />
              <Fila label="Avance del periodo" valor={`${preview.periodoPct}%`} destacado />
              <div className="border-t border-zinc-200 pt-2">
                <Fila label="Importe bruto" valor={formatImporte(preview.grossAmount, "MXN")} destacado nota={preview.grossAmountManual ? "Sobrescrito manualmente" : undefined} />
                <Fila label="(−) Retención" valor={formatImporte(preview.retention, "MXN")} />
                <Fila label="(−) Amortización de anticipo" valor={formatImporte(preview.advanceAmort, "MXN")} nota={`Saldo de anticipo disponible: ${formatImporte(preview.saldoAnticipoDisponible, "MXN")}`} />
              </div>
              <div className="border-t border-zinc-200 pt-2">
                <Fila label="NETO A COBRAR" valor={formatImporte(preview.netAmount, "MXN")} destacado grande />
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-2 rounded-md border border-zinc-100 p-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={sobrescribir} onChange={(e) => setSobrescribir(e.target.checked)} className="rounded border-zinc-300" />
            <span className="text-sm text-zinc-700">Sobrescribir importe bruto (el cliente autorizó un monto distinto)</span>
          </label>
          {sobrescribir && (
            <input
              type="number"
              min="0"
              step="0.01"
              value={brutoManual || ""}
              onChange={(e) => setBrutoManual(parseFloat(e.target.value) || 0)}
              className={INPUT}
              placeholder="Importe bruto autorizado"
            />
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} disabled={guardando} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando || cargandoPreview || !preview || !!previewError}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-dark disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Fila({ label, valor, nota, destacado, grande }: { label: string; valor: string; nota?: string; destacado?: boolean; grande?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className={destacado ? "font-medium text-zinc-800" : "text-zinc-600"}>{label}</span>
        {nota && <p className="text-xs text-zinc-400">{nota}</p>}
      </div>
      <span className={grande ? "text-base font-bold text-primary" : destacado ? "font-semibold text-zinc-800" : "text-zinc-700"}>
        {valor}
      </span>
    </div>
  );
}
