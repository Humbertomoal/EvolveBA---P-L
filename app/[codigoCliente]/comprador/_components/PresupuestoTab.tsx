"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  IconChevronDown,
  IconChevronRight,
  IconLock,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { PresupuestoPartidaDTO } from "@/src/lib/presupuestoTypes";
import { desviacion, pctConsumo, validarLinea, validarPartida, type LineaFormInput, type PartidaFormInput } from "@/src/lib/presupuestoTypes";
import type { CostAccountDTO } from "@/src/lib/costAccountTypes";
import { cuentasParaPartida } from "@/src/lib/costAccountTypes";
import {
  crearPartidaAction,
  actualizarPartidaAction,
  eliminarPartidaAction,
  crearLineaAction,
  actualizarLineaAction,
  eliminarLineaAction,
} from "@/src/lib/presupuestoActions";
import type { PermisoModulo } from "@/src/lib/permisos";
import { formatImporte } from "@/src/lib/monedas";
import EmptyState from "@/src/components/EmptyState";

type ModalPartida = { open: false } | { open: true; modo: "crear" } | { open: true; modo: "editar"; partida: PresupuestoPartidaDTO };
type ModalLinea = { open: false } | { open: true; partida: PresupuestoPartidaDTO; modo: "crear" } | { open: true; partida: PresupuestoPartidaDTO; modo: "editar"; lineaId: string; accountName: string; qty: number; unitPrice: number };

function vacioPartida(orderSugerido: number): PartidaFormInput {
  return { code: "", name: "", order: orderSugerido };
}

function vacioLinea(): LineaFormInput {
  return { accountId: "", qty: 1, unitPrice: 0 };
}

export default function PresupuestoTab({
  projectId,
  partidas,
  cuentas,
  permiso,
  clienteId,
}: {
  projectId: string;
  partidas: PresupuestoPartidaDTO[];
  cuentas: CostAccountDTO[];
  permiso: PermisoModulo;
  clienteId: string;
}) {
  const router = useRouter();
  const cuentasSelect = useMemo(() => cuentasParaPartida(cuentas), [cuentas]);

  // Set de COLAPSADAS (opt-out) en vez de expandidas (opt-in): así una partida
  // creada después del primer render (router.refresh trae un id nuevo) nace
  // expandida por default, en vez de quedar oculta porque nunca entró al Set.
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());
  const [modalPartida, setModalPartida] = useState<ModalPartida>({ open: false });
  const [modalLinea, setModalLinea] = useState<ModalLinea>({ open: false });
  const [formPartida, setFormPartida] = useState<PartidaFormInput>(vacioPartida(0));
  const [formLinea, setFormLinea] = useState<LineaFormInput>(vacioLinea());
  const [formError, setFormError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [confirmando, setConfirmando] = useState<{ tipo: "partida" | "linea"; id: string } | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  function toggle(id: string) {
    setColapsadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function abrirCrearPartida() {
    setFormPartida(vacioPartida(partidas.length + 1));
    setFormError(null);
    setModalPartida({ open: true, modo: "crear" });
  }

  function abrirEditarPartida(p: PresupuestoPartidaDTO) {
    setFormPartida({ code: p.code, name: p.name, order: p.order });
    setFormError(null);
    setModalPartida({ open: true, modo: "editar", partida: p });
  }

  async function guardarPartida() {
    const error = validarPartida(formPartida);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setCargando(true);
    const result =
      modalPartida.open && modalPartida.modo === "editar"
        ? await actualizarPartidaAction(modalPartida.partida.id, clienteId, formPartida)
        : await crearPartidaAction(projectId, clienteId, formPartida);
    setCargando(false);
    if (!result.ok) {
      setFormError(result.error ?? "Error al guardar.");
      toast.error(result.error ?? "No se pudo guardar la partida.");
      return;
    }
    toast.success("Partida guardada correctamente");
    setModalPartida({ open: false });
    router.refresh();
  }

  async function eliminarPartida(id: string) {
    setCargando(true);
    setBannerError(null);
    const result = await eliminarPartidaAction(id, clienteId);
    setCargando(false);
    setConfirmando(null);
    if (!result.ok) {
      setBannerError(result.error ?? "Error al eliminar.");
      toast.error(result.error ?? "No se pudo eliminar la partida.");
      return;
    }
    toast.success("Partida eliminada correctamente");
    router.refresh();
  }

  function abrirCrearLinea(p: PresupuestoPartidaDTO) {
    setFormLinea(vacioLinea());
    setFormError(null);
    setModalLinea({ open: true, partida: p, modo: "crear" });
  }

  function abrirEditarLinea(p: PresupuestoPartidaDTO, lineaId: string, accountName: string, qty: number, unitPrice: number) {
    setFormLinea({ accountId: "", qty, unitPrice });
    setFormError(null);
    setModalLinea({ open: true, partida: p, modo: "editar", lineaId, accountName, qty, unitPrice });
  }

  async function guardarLinea() {
    if (!modalLinea.open) return;
    setCargando(true);

    if (modalLinea.modo === "crear") {
      const error = validarLinea(formLinea);
      if (error) {
        setCargando(false);
        setFormError(error);
        return;
      }
      const result = await crearLineaAction(modalLinea.partida.id, clienteId, formLinea);
      setCargando(false);
      if (!result.ok) {
        setFormError(result.error ?? "Error al guardar.");
        toast.error(result.error ?? "No se pudo crear la línea.");
        return;
      }
    } else {
      if (!Number.isFinite(formLinea.qty) || formLinea.qty <= 0) {
        setCargando(false);
        setFormError("La cantidad debe ser mayor a 0.");
        return;
      }
      if (!Number.isFinite(formLinea.unitPrice) || formLinea.unitPrice < 0) {
        setCargando(false);
        setFormError("El precio unitario no puede ser negativo.");
        return;
      }
      const result = await actualizarLineaAction(modalLinea.lineaId, clienteId, {
        qty: formLinea.qty,
        unitPrice: formLinea.unitPrice,
      });
      setCargando(false);
      if (!result.ok) {
        setFormError(result.error ?? "Error al guardar.");
        toast.error(result.error ?? "No se pudo actualizar la línea.");
        return;
      }
    }

    setFormError(null);
    toast.success("Línea guardada correctamente");
    setModalLinea({ open: false });
    router.refresh();
  }

  async function eliminarLinea(id: string) {
    setCargando(true);
    setBannerError(null);
    const result = await eliminarLineaAction(id, clienteId);
    setCargando(false);
    setConfirmando(null);
    if (!result.ok) {
      setBannerError(result.error ?? "Error al eliminar.");
      toast.error(result.error ?? "No se pudo eliminar la línea.");
      return;
    }
    toast.success("Línea eliminada correctamente");
    router.refresh();
  }

  const totalPresupuesto = partidas.reduce((acc, p) => acc + p.amount, 0);
  const totalReal = partidas.reduce((acc, p) => acc + p.real, 0);

  const INPUT =
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">Presupuesto por partida y cuenta, vs. costo real ejecutado</p>
        {permiso.crear && (
          <button
            type="button"
            onClick={abrirCrearPartida}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-dark"
          >
            <IconPlus className="h-4 w-4" />
            Agregar partida
          </button>
        )}
      </div>

      {bannerError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{bannerError}</div>
      )}

      {partidas.length === 0 ? (
        <EmptyState
          icon="IconClipboardList"
          title="Sin partidas"
          description="Agrega la primera partida (Fabricación, Montaje, Pintura...) para empezar a presupuestar."
          actionLabel={permiso.crear ? "Agregar partida" : undefined}
          onAction={permiso.crear ? abrirCrearPartida : undefined}
        />
      ) : (
        <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                  <th className="px-3 py-2.5">Partida / Cuenta</th>
                  <th className="px-3 py-2.5">Cant</th>
                  <th className="px-3 py-2.5">P.U.</th>
                  <th className="px-3 py-2.5">Importe</th>
                  <th className="px-3 py-2.5">Real</th>
                  <th className="px-3 py-2.5">Desv.</th>
                  <th className="px-3 py-2.5">%</th>
                  <th className="px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {partidas.map((p) => {
                  const abierta = !colapsadas.has(p.id);
                  const desv = desviacion(p.real, p.amount);
                  const pct = pctConsumo(p.real, p.amount);
                  return (
                    <Fragment key={p.id}>
                      <tr className="bg-zinc-50/70 font-semibold text-zinc-800">
                        <td className="px-3 py-2.5">
                          <button type="button" onClick={() => toggle(p.id)} className="flex items-center gap-1.5">
                            {abierta ? <IconChevronDown className="h-4 w-4 text-zinc-400" /> : <IconChevronRight className="h-4 w-4 text-zinc-400" />}
                            <span className="font-mono text-xs text-zinc-400">{p.code}</span>
                            {p.name}
                          </button>
                        </td>
                        <td className="px-3 py-2.5"></td>
                        <td className="px-3 py-2.5"></td>
                        <td className="px-3 py-2.5">{formatImporte(p.amount, "MXN")}</td>
                        <td className="px-3 py-2.5">{formatImporte(p.real, "MXN")}</td>
                        <td className={`px-3 py-2.5 ${desv > 0 ? "text-red-600" : "text-green-600"}`}>
                          {desv === 0 ? "—" : formatImporte(desv, "MXN")}
                        </td>
                        <td className={`px-3 py-2.5 ${pct > 100 ? "text-red-600" : "text-zinc-700"}`}>{pct}%</td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {permiso.crear && (
                              <button type="button" onClick={() => abrirCrearLinea(p)} title="Agregar línea" className="rounded p-1.5 text-zinc-400 hover:bg-primary/10 hover:text-primary">
                                <IconPlus className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {permiso.editar && (
                              <button type="button" onClick={() => abrirEditarPartida(p)} title="Editar partida" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                                <IconPencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {permiso.eliminar &&
                              (confirmando?.tipo === "partida" && confirmando.id === p.id ? (
                                <span className="flex items-center gap-1 text-xs">
                                  <span className="text-zinc-500">¿Eliminar?</span>
                                  <button type="button" disabled={cargando} onClick={() => eliminarPartida(p.id)} className="font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">Sí</button>
                                  <button type="button" onClick={() => setConfirmando(null)} className="text-zinc-400 hover:text-zinc-600">No</button>
                                </span>
                              ) : (
                                <button type="button" onClick={() => setConfirmando({ tipo: "partida", id: p.id })} title="Eliminar partida" className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600">
                                  <IconTrash className="h-3.5 w-3.5" />
                                </button>
                              ))}
                          </div>
                        </td>
                      </tr>

                      {abierta &&
                        p.lineas.map((l) => {
                          const desvL = desviacion(l.real, l.amount);
                          const pctL = pctConsumo(l.real, l.amount);
                          return (
                            <tr key={l.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                              <td className="px-3 py-2 pl-9 text-zinc-700">
                                <span className="font-mono text-xs text-zinc-400">{l.accountCode}</span> {l.accountName}
                                {l.isCalculated && (
                                  <span title="Calculado desde los elementos de la partida" className="ml-2 inline-flex items-center">
                                    <IconLock className="h-3.5 w-3.5 text-amber-500" />
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-zinc-600">{l.qty ?? "—"}</td>
                              <td className="px-3 py-2 text-zinc-600">{l.unitPrice !== null ? formatImporte(l.unitPrice, "MXN") : "—"}</td>
                              <td className="px-3 py-2 text-zinc-800">{formatImporte(l.amount, "MXN")}</td>
                              <td className="px-3 py-2 text-zinc-800">{formatImporte(l.real, "MXN")}</td>
                              <td className={`px-3 py-2 ${desvL > 0 ? "text-red-600" : "text-green-600"}`}>
                                {desvL === 0 ? "—" : formatImporte(desvL, "MXN")}
                              </td>
                              <td className={`px-3 py-2 ${pctL > 100 ? "text-red-600" : "text-zinc-600"}`}>{pctL}%</td>
                              <td className="px-3 py-2 text-right">
                                {l.isCalculated ? (
                                  <span className="text-xs text-zinc-400">—</span>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    {permiso.editar && (
                                      <button
                                        type="button"
                                        onClick={() => abrirEditarLinea(p, l.id, l.accountName, l.qty ?? 1, l.unitPrice ?? 0)}
                                        title="Editar línea"
                                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                                      >
                                        <IconPencil className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    {permiso.eliminar &&
                                      (confirmando?.tipo === "linea" && confirmando.id === l.id ? (
                                        <span className="flex items-center gap-1 text-xs">
                                          <span className="text-zinc-500">¿Eliminar?</span>
                                          <button type="button" disabled={cargando} onClick={() => eliminarLinea(l.id)} className="font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">Sí</button>
                                          <button type="button" onClick={() => setConfirmando(null)} className="text-zinc-400 hover:text-zinc-600">No</button>
                                        </span>
                                      ) : (
                                        <button type="button" onClick={() => setConfirmando({ tipo: "linea", id: l.id })} title="Eliminar línea" className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600">
                                          <IconTrash className="h-3.5 w-3.5" />
                                        </button>
                                      ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-surface-muted text-sm font-bold text-zinc-800">
                  <td className="px-3 py-3">TOTAL</td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3">{formatImporte(totalPresupuesto, "MXN")}</td>
                  <td className="px-3 py-3">{formatImporte(totalReal, "MXN")}</td>
                  <td className={`px-3 py-3 ${desviacion(totalReal, totalPresupuesto) > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatImporte(desviacion(totalReal, totalPresupuesto), "MXN")}
                  </td>
                  <td className={`px-3 py-3 ${pctConsumo(totalReal, totalPresupuesto) > 100 ? "text-red-600" : "text-zinc-800"}`}>
                    {pctConsumo(totalReal, totalPresupuesto)}%
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {modalPartida.open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h2 className="text-base font-semibold text-zinc-900">
                {modalPartida.modo === "crear" ? "Agregar partida" : "Editar partida"}
              </h2>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Código <span className="text-red-500">*</span></label>
                  <input type="text" value={formPartida.code} onChange={(e) => setFormPartida((p) => ({ ...p, code: e.target.value }))} placeholder="Ej. 1" className={INPUT} autoFocus />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Nombre <span className="text-red-500">*</span></label>
                  <input type="text" value={formPartida.name} onChange={(e) => setFormPartida((p) => ({ ...p, name: e.target.value }))} placeholder="Ej. Fabricación" className={INPUT} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Orden</label>
                  <input type="number" value={formPartida.order} onChange={(e) => setFormPartida((p) => ({ ...p, order: parseInt(e.target.value, 10) || 0 }))} className={INPUT} />
                </div>
              </div>
              {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setModalPartida({ open: false })} disabled={cargando} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">Cancelar</button>
                <button type="button" onClick={guardarPartida} disabled={cargando} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-dark disabled:opacity-50">
                  {cargando ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {modalLinea.open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h2 className="text-base font-semibold text-zinc-900">
                {modalLinea.modo === "crear" ? "Agregar línea" : "Editar línea"}
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">{modalLinea.partida.code} - {modalLinea.partida.name}</p>

              <div className="mt-4 space-y-3">
                {modalLinea.modo === "crear" ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Cuenta <span className="text-red-500">*</span></label>
                    <select value={formLinea.accountId} onChange={(e) => setFormLinea((p) => ({ ...p, accountId: e.target.value }))} className={INPUT}>
                      <option value="">Selecciona una cuenta...</option>
                      {cuentasSelect
                        .filter((c) => !modalLinea.partida.lineas.some((l) => l.accountId === c.id))
                        .map((c) => (
                          <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                    Cuenta: <span className="font-medium text-zinc-700">{modalLinea.accountName}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Cantidad <span className="text-red-500">*</span></label>
                    <input type="number" min="0.01" step="0.01" value={formLinea.qty || ""} onChange={(e) => setFormLinea((p) => ({ ...p, qty: parseFloat(e.target.value) || 0 }))} className={INPUT} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">P.U. <span className="text-red-500">*</span></label>
                    <input type="number" min="0" step="0.01" value={formLinea.unitPrice || ""} onChange={(e) => setFormLinea((p) => ({ ...p, unitPrice: parseFloat(e.target.value) || 0 }))} className={INPUT} />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">Importe: {formatImporte((formLinea.qty || 0) * (formLinea.unitPrice || 0), "MXN")}</p>
              </div>

              {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setModalLinea({ open: false })} disabled={cargando} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">Cancelar</button>
                <button type="button" onClick={guardarLinea} disabled={cargando} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-dark disabled:opacity-50">
                  {cargando ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
