"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { ProjectStatus } from "@prisma/client";
import type { ProyectoDetalleDTO } from "@/src/lib/proyectosTypes";
import { PROJECT_STATUSES } from "@/src/lib/proyectosTypes";
import type { CatalogoOpcion } from "@/src/lib/getCatalogos";
import { crearProyectoAction, actualizarProyectoAction } from "@/src/lib/proyectosActions";
import { usePageTitle } from "@/app/_components/PageHeaderContext";

const INPUT =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";
const LABEL = "mb-1 block text-sm font-medium text-zinc-700";

export default function ProyectoForm({
  modo,
  proyecto,
  tipos,
  clienteId,
  basePath,
}: {
  modo: "crear" | "editar";
  proyecto?: ProyectoDetalleDTO;
  tipos: CatalogoOpcion[];
  clienteId: string;
  basePath: string;
}) {
  const router = useRouter();
  usePageTitle(modo === "crear" ? "Nuevo proyecto" : "Editar proyecto");

  const [code, setCode] = useState(proyecto?.code ?? "");
  const [name, setName] = useState(proyecto?.name ?? "");
  const [clientName, setClientName] = useState(proyecto?.clientName ?? "");
  const [type, setType] = useState(proyecto?.type ?? "");
  const [contractAmount, setContractAmount] = useState(proyecto ? String(proyecto.contractAmount) : "");
  const [advanceAmount, setAdvanceAmount] = useState(proyecto ? String(proyecto.advanceAmount) : "0");
  const [retentionPct, setRetentionPct] = useState(proyecto ? String(proyecto.retentionPct) : "0");
  const [startDate, setStartDate] = useState(proyecto?.startDate.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(proyecto?.endDate?.slice(0, 10) ?? "");
  const [status, setStatus] = useState<ProjectStatus>(proyecto?.status ?? "PLANEACION");
  const [notes, setNotes] = useState(proyecto?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const datos = {
      code,
      name,
      clientName,
      type: type || null,
      contractAmount: parseFloat(contractAmount),
      advanceAmount: parseFloat(advanceAmount || "0"),
      retentionPct: parseFloat(retentionPct || "0"),
      startDate,
      endDate: endDate || null,
      status,
      notes: notes || null,
    };

    const result =
      modo === "crear"
        ? await crearProyectoAction(clienteId, datos)
        : await actualizarProyectoAction(proyecto!.id, clienteId, datos);

    setCargando(false);
    if (!result.ok) {
      setError(result.error ?? "Error al guardar.");
      toast.error(result.error ?? "No se pudo guardar el proyecto.");
      return;
    }
    toast.success(modo === "crear" ? "Proyecto creado correctamente" : "Proyecto actualizado correctamente");
    router.push(
      modo === "crear" ? `${basePath}/comprador/proyectos` : `${basePath}/comprador/proyectos/${proyecto!.id}`
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="rounded-card border border-border bg-white p-6 shadow-card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Código <span className="text-red-500">*</span></label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className={INPUT} required autoFocus />
          </div>
          <div>
            <label className={LABEL}>Nombre <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Cliente <span className="text-red-500">*</span></label>
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className={INPUT} required />
          </div>
          <div>
            <label className={LABEL}>Tipo de proyecto</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={INPUT}>
              <option value="">Sin especificar</option>
              {tipos.map((t) => (
                <option key={t.codigo} value={t.nombre}>{t.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={LABEL}>Monto del contrato (MXN) <span className="text-red-500">*</span></label>
            <input type="number" min="0.01" step="0.01" value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} className={INPUT} required />
          </div>
          <div>
            <label className={LABEL}>Anticipo (MXN)</label>
            <input type="number" min="0" step="0.01" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Retención (%)</label>
            <input type="number" min="0" max="100" step="0.01" value={retentionPct} onChange={(e) => setRetentionPct(e.target.value)} className={INPUT} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={LABEL}>Fecha de inicio <span className="text-red-500">*</span></label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={INPUT} required />
          </div>
          <div>
            <label className={LABEL}>Fecha de fin (opcional)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Estatus</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={INPUT}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL}>Notas</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={INPUT} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={cargando}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={cargando}
          className="rounded-md bg-[var(--color-primario)] px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--color-secundario)] disabled:opacity-50"
        >
          {cargando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
