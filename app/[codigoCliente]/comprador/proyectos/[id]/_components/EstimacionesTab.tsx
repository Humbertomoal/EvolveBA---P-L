"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { EstimacionDTO } from "@/src/lib/estimacionesTypes";
import {
  eliminarEstimacionAction,
  enviarEstimacionAction,
  autorizarEstimacionAction,
  marcarPagadaEstimacionAction,
  regresarABorradorAction,
} from "@/src/lib/estimacionesActions";
import type { PermisoModulo } from "@/src/lib/permisos";
import { formatImporte } from "@/src/lib/monedas";
import EmptyState from "@/src/components/EmptyState";
import Badge, { type BadgeVariant } from "@/src/components/Badge";
import EstimacionModal from "./EstimacionModal";

const ESTATUS_VARIANT: Record<EstimacionDTO["status"], BadgeVariant> = {
  BORRADOR: "neutral",
  ENVIADA: "info",
  AUTORIZADA: "warning",
  PAGADA: "success",
};

const ESTATUS_LABEL: Record<EstimacionDTO["status"], string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  AUTORIZADA: "Autorizada",
  PAGADA: "Pagada",
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function EstimacionesTab({
  projectId,
  estimaciones,
  contractAmount,
  facturado,
  permiso,
  clienteId,
}: {
  projectId: string;
  estimaciones: EstimacionDTO[];
  contractAmount: number;
  facturado: number;
  permiso: PermisoModulo;
  clienteId: string;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<{ open: false } | { open: true; editando: EstimacionDTO | null }>({ open: false });
  const [cargandoId, setCargandoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  async function ejecutar(id: string, accion: (id: string, clienteId: string) => Promise<{ ok: boolean; error?: string }>, mensajeOk: string) {
    setCargandoId(id);
    const result = await accion(id, clienteId);
    setCargandoId(null);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo completar la acción.");
      return;
    }
    toast.success(mensajeOk);
    router.refresh();
  }

  function cerrarModal() {
    setModal({ open: false });
  }

  function guardado() {
    setModal({ open: false });
    router.refresh();
  }

  const pctFacturado = contractAmount > 0 ? Math.round((facturado / contractAmount) * 1000) / 10 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">El avance se calcula solo desde los elementos capturados en obra</p>
        {permiso.crear && (
          <button
            type="button"
            onClick={() => setModal({ open: true, editando: null })}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-dark"
          >
            <IconPlus className="h-4 w-4" />
            Nueva estimación
          </button>
        )}
      </div>

      {estimaciones.length === 0 ? (
        <EmptyState
          icon="IconFileInvoice"
          title="Sin estimaciones"
          description="Crea la primera estimación para empezar a facturar el avance de obra."
          actionLabel={permiso.crear ? "Nueva estimación" : undefined}
          onAction={permiso.crear ? () => setModal({ open: true, editando: null }) : undefined}
        />
      ) : (
        <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Periodo</th>
                  <th className="px-3 py-2.5">Avance</th>
                  <th className="px-3 py-2.5">Bruto</th>
                  <th className="px-3 py-2.5">Retención</th>
                  <th className="px-3 py-2.5">Amortiz.</th>
                  <th className="px-3 py-2.5">Neto</th>
                  <th className="px-3 py-2.5">Estatus</th>
                  <th className="px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {estimaciones.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                    <td className="px-3 py-2.5 text-zinc-500">{e.number}</td>
                    <td className="px-3 py-2.5 text-zinc-600">{formatFecha(e.periodStart)} - {formatFecha(e.periodEnd)}</td>
                    <td className="px-3 py-2.5 text-zinc-700">{e.progressPct}%</td>
                    <td className="px-3 py-2.5 text-zinc-800">
                      {formatImporte(e.grossAmount, "MXN")}
                      {e.grossAmountManual && <span title="Sobrescrito manualmente" className="ml-1 text-xs text-amber-500">✎</span>}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600">{formatImporte(e.retention, "MXN")}</td>
                    <td className="px-3 py-2.5 text-zinc-600">{formatImporte(e.advanceAmort, "MXN")}</td>
                    <td className="px-3 py-2.5 font-medium text-zinc-800">{formatImporte(e.netAmount, "MXN")}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={ESTATUS_VARIANT[e.status]}>{ESTATUS_LABEL[e.status]}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {e.status === "BORRADOR" && permiso.editar && (
                          <button type="button" onClick={() => setModal({ open: true, editando: e })} title="Editar" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                            <IconPencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {e.status === "BORRADOR" && permiso.editar && (
                          <button
                            type="button"
                            disabled={cargandoId === e.id}
                            onClick={() => ejecutar(e.id, enviarEstimacionAction, "Estimación enviada")}
                            className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                          >
                            Enviar
                          </button>
                        )}
                        {e.status === "ENVIADA" && permiso.editar && (
                          <button
                            type="button"
                            disabled={cargandoId === e.id}
                            onClick={() => ejecutar(e.id, autorizarEstimacionAction, "Estimación autorizada")}
                            className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                          >
                            Autorizar
                          </button>
                        )}
                        {e.status === "AUTORIZADA" && permiso.editar && (
                          <button
                            type="button"
                            disabled={cargandoId === e.id}
                            onClick={() => ejecutar(e.id, marcarPagadaEstimacionAction, "Estimación marcada como pagada")}
                            className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                          >
                            Marcar pagada
                          </button>
                        )}
                        {e.status !== "BORRADOR" && permiso.eliminar && (
                          <button
                            type="button"
                            disabled={cargandoId === e.id}
                            onClick={() => ejecutar(e.id, regresarABorradorAction, "Estimación regresada a Borrador")}
                            title="Regresar a Borrador"
                            className="rounded px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
                          >
                            Regresar a Borrador
                          </button>
                        )}
                        {e.status === "BORRADOR" && permiso.eliminar && (
                          confirmandoId === e.id ? (
                            <span className="flex items-center gap-1 text-xs">
                              <span className="text-zinc-500">¿Eliminar?</span>
                              <button
                                type="button"
                                disabled={cargandoId === e.id}
                                onClick={async () => {
                                  await ejecutar(e.id, eliminarEstimacionAction, "Estimación eliminada");
                                  setConfirmandoId(null);
                                }}
                                className="font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                              >
                                Sí
                              </button>
                              <button type="button" onClick={() => setConfirmandoId(null)} className="text-zinc-400 hover:text-zinc-600">No</button>
                            </span>
                          ) : (
                            <button type="button" onClick={() => setConfirmandoId(e.id)} title="Eliminar" className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600">
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
            Facturado acumulado: {formatImporte(facturado, "MXN")} de {formatImporte(contractAmount, "MXN")} ({pctFacturado}%)
          </div>
        </div>
      )}

      {modal.open && (
        <EstimacionModal
          projectId={projectId}
          clienteId={clienteId}
          editando={modal.editando}
          onCerrar={cerrarModal}
          onGuardado={guardado}
        />
      )}
    </div>
  );
}
