"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconDeviceFloppy } from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { CuadrillaDTO } from "@/src/lib/personalTypes";
import type { PermisoModulo } from "@/src/lib/permisos";
import type { ElementoParaCapturaDTO, EmpleadoCapturaDTO, EstadoCapturaDTO } from "@/src/lib/capturaTypes";
import { validarProgresoAcumulativo } from "@/src/lib/capturaTypes";
import { getEstadoCapturaAction, guardarCapturaAction } from "@/src/lib/capturaActions";
import PanelHoras from "./PanelHoras";
import PanelAvance, { type EtapaEditable } from "./PanelAvance";

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CapturaTab({
  projectId,
  clienteId,
  elementos,
  cuadrillas,
  permiso,
  elementoPreseleccionado,
}: {
  projectId: string;
  clienteId: string;
  elementos: ElementoParaCapturaDTO[];
  cuadrillas: CuadrillaDTO[];
  permiso: PermisoModulo;
  elementoPreseleccionado: string | null;
}) {
  const router = useRouter();

  const [fecha, setFecha] = useState(hoy());
  const [elementoId, setElementoId] = useState(elementoPreseleccionado ?? elementos[0]?.id ?? "");
  const [estado, setEstado] = useState<EstadoCapturaDTO | null>(null);
  const [empleadosState, setEmpleadosState] = useState<EmpleadoCapturaDTO[]>([]);
  const [etapasState, setEtapasState] = useState<EtapaEditable[]>([]);
  const [horasParaTodos, setHorasParaTodos] = useState("8");

  const [cargandoEstado, setCargandoEstado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const cargarEstado = useCallback(async () => {
    if (!elementoId) return;
    const requestId = ++requestIdRef.current;
    setCargandoEstado(true);
    setError(null);
    const result = await getEstadoCapturaAction(projectId, clienteId, elementoId, fecha);
    if (requestId !== requestIdRef.current) return; // respuesta de una petición anterior (elemento/fecha ya cambió), se descarta
    setCargandoEstado(false);
    if (!result.ok || !result.estado) {
      setError(result.error ?? "No se pudo cargar la captura.");
      return;
    }
    setEstado(result.estado);
    setEmpleadosState(result.estado.empleados);
    setEtapasState(
      result.estado.etapas.map((e) => ({
        stageId: e.stageId,
        code: e.code,
        name: e.name,
        weightPct: e.weightPct,
        order: e.order,
        qtyAnterior: e.qtyDone,
        qtyNuevo: e.qtyDone,
      }))
    );
  }, [projectId, clienteId, elementoId, fecha]);

  useEffect(() => {
    cargarEstado();
  }, [cargarEstado]);

  function handleCuadrillaChange(crewId: string) {
    if (!crewId) return;
    const cuadrilla = cuadrillas.find((c) => c.id === crewId);
    if (!cuadrilla) return;
    setEmpleadosState((prev) =>
      prev.map((e) => {
        const perteneceACuadrilla = e.crewId === crewId || e.employeeId === cuadrilla.leaderId;
        if (!perteneceACuadrilla || e.marcado) return e;
        const horasDefault = parseFloat(horasParaTodos);
        return { ...e, marcado: true, horas: e.horas || (Number.isFinite(horasDefault) ? horasDefault : 8) };
      })
    );
  }

  function handleHorasParaTodosChange(value: string) {
    setHorasParaTodos(value);
    const horas = parseFloat(value);
    if (!Number.isFinite(horas)) return;
    setEmpleadosState((prev) => prev.map((e) => (e.marcado ? { ...e, horas } : e)));
  }

  function handleToggleMarcado(employeeId: string) {
    setEmpleadosState((prev) =>
      prev.map((e) => {
        if (e.employeeId !== employeeId) return e;
        const marcado = !e.marcado;
        const horasDefault = parseFloat(horasParaTodos);
        return {
          ...e,
          marcado,
          horas: marcado && !e.horas ? (Number.isFinite(horasDefault) ? horasDefault : 8) : e.horas,
        };
      })
    );
  }

  function handleHorasIndividualChange(employeeId: string, value: string) {
    const horas = parseFloat(value);
    setEmpleadosState((prev) =>
      prev.map((e) => (e.employeeId === employeeId ? { ...e, horas: Number.isFinite(horas) ? horas : 0 } : e))
    );
  }

  function handleCambiarQty(stageId: string, value: string) {
    const qty = parseInt(value, 10);
    setEtapasState((prev) =>
      prev.map((e) => (e.stageId === stageId ? { ...e, qtyNuevo: Number.isFinite(qty) ? qty : 0 } : e))
    );
  }

  async function handleGuardar() {
    if (!estado) return;
    setError(null);

    const errorProgreso = validarProgresoAcumulativo(
      etapasState.map((e) => ({ name: e.name, order: e.order, qtyDone: e.qtyNuevo })),
      estado.elemento.qty
    );
    if (errorProgreso) {
      setError(errorProgreso);
      toast.error(errorProgreso);
      return;
    }

    const horasMarcadas = empleadosState.filter((e) => e.marcado).map((e) => ({ employeeId: e.employeeId, hours: e.horas }));
    for (const h of horasMarcadas) {
      if (!Number.isFinite(h.hours) || h.hours <= 0 || h.hours > 24) {
        setError("Las horas de cada empleado marcado deben ser mayores a 0 y no más de 24.");
        toast.error("Revisa las horas capturadas.");
        return;
      }
    }

    setGuardando(true);
    const result = await guardarCapturaAction(projectId, clienteId, {
      elementId: elementoId,
      date: fecha,
      horas: horasMarcadas,
      progreso: etapasState.map((e) => ({ stageId: e.stageId, qtyDone: e.qtyNuevo })),
    });
    setGuardando(false);

    if (!result.ok) {
      setError(result.error ?? "Error al guardar la captura.");
      toast.error(result.error ?? "No se pudo guardar la captura.");
      return;
    }

    toast.success("Captura guardada correctamente");
    await cargarEstado();
    router.refresh();
  }

  if (elementos.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
        Este proyecto todavía no tiene elementos. Agrégalos desde la edición del proyecto antes de capturar avance.
      </div>
    );
  }

  const INPUT =
    "rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 rounded-card border border-border bg-white p-4 shadow-card">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Elemento</label>
          <select value={elementoId} onChange={(e) => setElementoId(e.target.value)} className={INPUT}>
            {elementos.map((e) => (
              <option key={e.id} value={e.id}>{e.code} - {e.name}</option>
            ))}
          </select>
        </div>
        {permiso.crear || permiso.editar ? (
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando || cargandoEstado || !estado}
            className="ml-auto flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-dark disabled:opacity-50"
          >
            <IconDeviceFloppy className="h-4 w-4" />
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        ) : null}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {cargandoEstado || !estado ? (
        <div className="rounded-card border border-border bg-white p-8 text-center text-sm text-zinc-400 shadow-card">
          Cargando…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PanelHoras
            empleados={empleadosState}
            cuadrillas={cuadrillas}
            horasParaTodos={horasParaTodos}
            onCuadrillaChange={handleCuadrillaChange}
            onHorasParaTodosChange={handleHorasParaTodosChange}
            onToggleMarcado={handleToggleMarcado}
            onHorasIndividualChange={handleHorasIndividualChange}
          />
          <PanelAvance etapas={etapasState} qty={estado.elemento.qty} onCambiarQty={handleCambiarQty} />
        </div>
      )}
    </div>
  );
}
