"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { ComparativoMesDTO, PayrollFormInput, PayrollPeriodDTO } from "@/src/lib/payrollTypes";
import { PAYROLL_TYPES, validarPayroll } from "@/src/lib/payrollTypes";
import { guardarPayrollPeriodAction, eliminarPayrollPeriodAction } from "@/src/lib/payrollActions";
import { formatImporte } from "@/src/lib/monedas";
import { usePageTitle } from "@/app/_components/PageHeaderContext";
import EmptyState from "@/src/components/EmptyState";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function ahora() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function vacioForm(): PayrollFormInput {
  const { year, month } = ahora();
  return { year, month, type: "OPERATIVA", amount: 0, notes: null };
}

export default function NominaView({
  periodos,
  comparativo,
  permiso,
  clienteId,
}: {
  periodos: PayrollPeriodDTO[];
  comparativo: ComparativoMesDTO[];
  permiso: { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean };
  clienteId: string;
}) {
  const router = useRouter();
  usePageTitle("Nómina");

  const [form, setForm] = useState<PayrollFormInput>(vacioForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  function editar(p: PayrollPeriodDTO) {
    setForm({ year: p.year, month: p.month, type: p.type, amount: p.amount, notes: p.notes });
    setFormError(null);
  }

  async function handleGuardar() {
    const error = validarPayroll(form);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setCargando(true);
    const result = await guardarPayrollPeriodAction(clienteId, form);
    setCargando(false);
    if (!result.ok) {
      setFormError(result.error ?? "Error al guardar.");
      toast.error(result.error ?? "No se pudo guardar la nómina.");
      return;
    }
    toast.success("Nómina guardada correctamente");
    setForm(vacioForm());
    router.refresh();
  }

  async function handleEliminar(id: string) {
    setCargando(true);
    const result = await eliminarPayrollPeriodAction(id);
    setCargando(false);
    setConfirmandoId(null);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo eliminar.");
      return;
    }
    toast.success("Registro eliminado");
    router.refresh();
  }

  const INPUT =
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";

  return (
    <div className="max-w-4xl space-y-6">
      <p className="text-sm text-zinc-500">
        Nómina real pagada por mes. La Nómina Operativa se compara contra las horas-hombre
        cargadas a obra para calcular la ociosidad.
      </p>

      {permiso.crear && (
        <div className="rounded-card border border-border bg-white p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900">Captura mensual</h3>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Año</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm((p) => ({ ...p, year: parseInt(e.target.value, 10) || p.year }))}
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Mes</label>
              <select value={form.month} onChange={(e) => setForm((p) => ({ ...p, month: parseInt(e.target.value, 10) }))} className={INPUT}>
                {MESES.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Tipo</label>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as PayrollFormInput["type"] }))} className={INPUT}>
                {PAYROLL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Monto pagado</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount || ""}
                onChange={(e) => setForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                className={INPUT}
              />
            </div>
          </div>
          {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleGuardar}
              disabled={cargando}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-dark disabled:opacity-50"
            >
              {cargando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
        <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
          <span className="text-sm font-medium text-zinc-700">Periodos registrados</span>
        </div>
        {periodos.length === 0 ? (
          <div className="px-4 py-2">
            <EmptyState icon="IconCash" title="Sin nómina capturada" description="Captura el primer periodo mensual." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                <th className="px-4 py-2.5">Mes</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5">Monto</th>
                <th className="px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {periodos.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                  <td className="px-4 py-2.5 text-zinc-700">{MESES[p.month - 1]} {p.year}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{PAYROLL_TYPES.find((t) => t.value === p.type)?.label}</td>
                  <td className="px-4 py-2.5 text-zinc-800">{formatImporte(p.amount, "MXN")}</td>
                  <td className="px-4 py-2.5 text-right">
                    {confirmandoId === p.id ? (
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <span className="text-zinc-500">¿Eliminar?</span>
                        <button type="button" disabled={cargando} onClick={() => handleEliminar(p.id)} className="font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">Sí</button>
                        <button type="button" onClick={() => setConfirmandoId(null)} className="text-zinc-400 hover:text-zinc-600">No</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        {permiso.editar && (
                          <button type="button" onClick={() => editar(p)} title="Editar" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                            <IconPencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {permiso.eliminar && (
                          <button type="button" onClick={() => setConfirmandoId(p.id)} title="Eliminar" className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600">
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
        <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
          <span className="text-sm font-medium text-zinc-700">MO aplicada vs nómina real (Operativa)</span>
        </div>
        {comparativo.length === 0 ? (
          <div className="px-4 py-2">
            <EmptyState icon="IconChartBar" title="Sin datos" description="Captura nómina Operativa para ver el comparativo." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                <th className="px-4 py-2.5">Mes</th>
                <th className="px-4 py-2.5">Nómina real</th>
                <th className="px-4 py-2.5">MO aplicada</th>
                <th className="px-4 py-2.5">Ociosidad</th>
                <th className="px-4 py-2.5">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {comparativo.map((c) => (
                <tr key={`${c.year}-${c.month}`} className="hover:bg-zinc-50/50 transition-colors duration-150">
                  <td className="px-4 py-2.5 text-zinc-700">{MESES[c.month - 1]} {c.year}</td>
                  <td className="px-4 py-2.5 text-zinc-800">{formatImporte(c.nominaReal, "MXN")}</td>
                  <td className="px-4 py-2.5 text-zinc-800">{formatImporte(c.moAplicada, "MXN")}</td>
                  <td className={`px-4 py-2.5 font-medium ${c.ociosidad < 0 ? "text-red-600" : "text-zinc-800"}`}>
                    {formatImporte(c.ociosidad, "MXN")}
                  </td>
                  <td className={`px-4 py-2.5 font-medium ${c.ociosidad < 0 ? "text-red-600" : "text-zinc-800"}`}>
                    {c.ociosidadPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
