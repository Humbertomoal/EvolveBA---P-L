"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus, IconUserPlus, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { ProjectStatus } from "@prisma/client";
import type {
  ElementoProyectoDTO,
  EmpleadoAsignadoDTO,
  EmpleadoParaAsignarDTO,
  ProyectoDetalleDTO,
} from "@/src/lib/proyectosTypes";
import { PROJECT_STATUSES } from "@/src/lib/proyectosTypes";
import type { CatalogoOpcion } from "@/src/lib/getCatalogos";
import type { CuadrillaDTO } from "@/src/lib/personalTypes";
import type { ElementTypeDTO } from "@/src/lib/elementTypesTypes";
import { calcularCostoSugerido, calcularPesoUnitario } from "@/src/lib/elementTypesTypes";
import { crearProyectoAction, actualizarProyectoAction } from "@/src/lib/proyectosActions";
import { usePageTitle } from "@/app/_components/PageHeaderContext";
import AsignarPersonalModal from "./AsignarPersonalModal";
import SeleccionarElementosModal from "./SeleccionarElementosModal";
import ElementosProyectoTable, { type FilaElementoProyecto } from "./ElementosProyectoTable";

const INPUT =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";
const LABEL = "mb-1 block text-sm font-medium text-zinc-700";

function filaDesdeElementoExistente(e: ElementoProyectoDTO): FilaElementoProyecto {
  const pu = calcularPesoUnitario(e.weightUnit, e.weightValueCatalogo, e.length);
  const sugerido = calcularCostoSugerido(e.priceUnit, e.estimatedPriceCatalogo, pu, e.length);
  return {
    clientKey: e.elementId,
    elementId: e.elementId,
    elementTypeId: e.elementTypeId,
    elementTypeName: e.elementTypeName,
    elementTypeFamily: e.elementTypeFamily,
    weightUnit: e.weightUnit,
    weightValueCatalogo: e.weightValueCatalogo,
    priceUnit: e.priceUnit,
    estimatedPriceCatalogo: e.estimatedPriceCatalogo,
    code: e.code,
    qty: e.qty,
    length: e.length,
    unitCost: e.unitCost,
    costoSobrescrito: Math.abs(e.unitCost - sugerido) > 0.005,
  };
}

function filaDesdeElementType(t: ElementTypeDTO): FilaElementoProyecto {
  const length = t.lengthM;
  const pu = calcularPesoUnitario(t.weightUnit, t.weightValue, length);
  const costo = calcularCostoSugerido(t.priceUnit, t.estimatedPrice, pu, length);
  return {
    clientKey: `nuevo-${t.id}-${Math.random().toString(36).slice(2)}`,
    elementTypeId: t.id,
    elementTypeName: t.name,
    elementTypeFamily: t.family,
    weightUnit: t.weightUnit,
    weightValueCatalogo: t.weightValue,
    priceUnit: t.priceUnit,
    estimatedPriceCatalogo: t.estimatedPrice,
    code: "",
    qty: 1,
    length,
    unitCost: costo,
    costoSobrescrito: false,
  };
}

export default function ProyectoForm({
  modo,
  proyecto,
  tipos,
  disponibles,
  cuadrillas,
  asignadosIniciales,
  tiposElemento,
  familiasElemento,
  elementosIniciales,
  puedeCrearTipoElemento,
  clienteId,
  basePath,
}: {
  modo: "crear" | "editar";
  proyecto?: ProyectoDetalleDTO;
  tipos: CatalogoOpcion[];
  disponibles: EmpleadoParaAsignarDTO[];
  cuadrillas: CuadrillaDTO[];
  asignadosIniciales?: EmpleadoAsignadoDTO[];
  tiposElemento: ElementTypeDTO[];
  familiasElemento: CatalogoOpcion[];
  elementosIniciales?: ElementoProyectoDTO[];
  puedeCrearTipoElemento: boolean;
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

  const [seleccionPersonal, setSeleccionPersonal] = useState<EmpleadoAsignadoDTO[]>(asignadosIniciales ?? []);
  const [modalPersonalAbierto, setModalPersonalAbierto] = useState(false);

  const [elementos, setElementos] = useState<FilaElementoProyecto[]>(() =>
    (elementosIniciales ?? []).map(filaDesdeElementoExistente)
  );
  const [modalElementosAbierto, setModalElementosAbierto] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function handleAceptarPersonal(employeeIds: string[]) {
    const porId = new Map(disponibles.map((e) => [e.id, e]));
    const existentePorId = new Map(seleccionPersonal.map((s) => [s.employeeId, s]));

    const nuevaSeleccion: EmpleadoAsignadoDTO[] = employeeIds.map((id) => {
      const existente = existentePorId.get(id);
      if (existente) return existente;
      const emp = porId.get(id)!;
      return {
        assignmentId: emp.id, // placeholder: aún no existe ProjectAssignment real
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
        crewId: emp.crewId,
        crewNombre: emp.crewNombre,
        hourlyCost: emp.hourlyCost,
      };
    });

    setSeleccionPersonal(nuevaSeleccion);
    setModalPersonalAbierto(false);
  }

  function quitarDeSeleccionPersonal(employeeId: string) {
    setSeleccionPersonal((prev) => prev.filter((s) => s.employeeId !== employeeId));
  }

  function handleAceptarElementos(tiposSeleccionados: ElementTypeDTO[]) {
    const nuevasFilas = tiposSeleccionados.map(filaDesdeElementType);
    setElementos((prev) => [...prev, ...nuevasFilas]);
    setModalElementosAbierto(false);
  }

  function handleCambiarFilaElemento(clientKey: string, patch: Partial<FilaElementoProyecto>) {
    setElementos((prev) => prev.map((f) => (f.clientKey === clientKey ? { ...f, ...patch } : f)));
  }

  function handleQuitarFilaElemento(clientKey: string) {
    setElementos((prev) => prev.filter((f) => f.clientKey !== clientKey));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const codigosElementos = elementos.map((f) => f.code.trim().toLowerCase());
    if (elementos.some((f) => !f.code.trim())) {
      setError("Todos los elementos necesitan un código de obra.");
      return;
    }
    if (new Set(codigosElementos).size !== codigosElementos.length) {
      setError("Hay códigos de elemento duplicados.");
      return;
    }

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
      employeeIds: seleccionPersonal.map((s) => s.employeeId),
      elementos: elementos.map((f) => ({
        id: f.elementId,
        elementTypeId: f.elementTypeId,
        code: f.code.trim(),
        qty: f.qty,
        length: f.length,
        unitCost: f.unitCost,
      })),
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
    <form onSubmit={handleSubmit} className="max-w-5xl space-y-6">
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

      <div className="rounded-card border border-border bg-white p-6 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Personal asignado</h2>
          <button
            type="button"
            onClick={() => setModalPersonalAbierto(true)}
            className="flex items-center gap-1.5 rounded-md bg-[var(--color-primario)] px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--color-secundario)]"
          >
            <IconUserPlus className="h-4 w-4" />
            Asignar cuadrilla / personal
          </button>
        </div>

        {seleccionPersonal.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin personal asignado todavía.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {seleccionPersonal.map((s) => (
              <span
                key={s.employeeId}
                className="flex items-center gap-1.5 rounded-full bg-zinc-100 py-1 pl-3 pr-1.5 text-xs font-medium text-zinc-700"
              >
                {s.name}
                {s.role ? ` · ${s.role}` : ""}
                <button
                  type="button"
                  onClick={() => quitarDeSeleccionPersonal(s.employeeId)}
                  title="Quitar"
                  className="rounded-full p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                >
                  <IconX className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-card border border-border bg-white p-6 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Elementos de la obra</h2>
          <button
            type="button"
            onClick={() => setModalElementosAbierto(true)}
            className="flex items-center gap-1.5 rounded-md bg-[var(--color-primario)] px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--color-secundario)]"
          >
            <IconPlus className="h-4 w-4" />
            Agregar elementos
          </button>
        </div>

        <ElementosProyectoTable
          filas={elementos}
          onCambiarFila={handleCambiarFilaElemento}
          onQuitarFila={handleQuitarFilaElemento}
        />
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

      {modalPersonalAbierto && (
        <AsignarPersonalModal
          disponibles={disponibles}
          cuadrillas={cuadrillas}
          seleccionInicial={seleccionPersonal.map((s) => s.employeeId)}
          onCerrar={() => setModalPersonalAbierto(false)}
          onAceptar={handleAceptarPersonal}
        />
      )}

      {modalElementosAbierto && (
        <SeleccionarElementosModal
          tiposIniciales={tiposElemento}
          familias={familiasElemento}
          clienteId={clienteId}
          puedeCrearTipo={puedeCrearTipoElemento}
          onCerrar={() => setModalElementosAbierto(false)}
          onAceptar={handleAceptarElementos}
        />
      )}
    </form>
  );
}
