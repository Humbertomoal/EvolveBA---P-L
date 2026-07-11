"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { CostoDTO, CostoFormInput } from "@/src/lib/costosTypes";
import { validarCosto } from "@/src/lib/costosTypes";
import type { CostAccountDTO } from "@/src/lib/costAccountTypes";
import { cuentasCapturables } from "@/src/lib/costAccountTypes";
import type { ProyectoDTO } from "@/src/lib/proyectosTypes";
import type { ElementoDeProyectoDTO } from "@/src/lib/getCaptura";
import { crearCostoAction, actualizarCostoAction, eliminarCostoAction } from "@/src/lib/costosActions";
import { formatImporte } from "@/src/lib/monedas";
import { usePageTitle } from "@/app/_components/PageHeaderContext";
import EmptyState from "@/src/components/EmptyState";
import Badge from "@/src/components/Badge";
import PanelFiltros, { type SeccionFiltroConfig } from "@/app/_components/PanelFiltros";

const EMPRESA = "__EMPRESA__";

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function vacioForm(): CostoFormInput {
  return {
    date: hoy(),
    accountId: "",
    projectId: null,
    elementId: null,
    supplierName: "",
    description: "",
    invoiceRef: "",
    amount: 0,
    paidAt: null,
  };
}

type ModalState = { open: false } | { open: true; modo: "crear" } | { open: true; modo: "editar"; costo: CostoDTO };

export default function CostosView({
  costos,
  cuentas,
  proyectos,
  elementos,
  permiso,
  clienteId,
}: {
  costos: CostoDTO[];
  cuentas: CostAccountDTO[];
  proyectos: ProyectoDTO[];
  elementos: ElementoDeProyectoDTO[];
  permiso: { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean };
  clienteId: string;
}) {
  const router = useRouter();
  usePageTitle("Costos");

  const cuentasSelect = useMemo(() => cuentasCapturables(cuentas), [cuentas]);
  const cuentasPorId = useMemo(() => new Map(cuentas.map((c) => [c.id, c])), [cuentas]);

  const [filtroCuenta, setFiltroCuenta] = useState("");
  const [filtroProyecto, setFiltroProyecto] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [modal, setModal] = useState<ModalState>({ open: false });
  const [form, setForm] = useState<CostoFormInput>(vacioForm());
  const [pagado, setPagado] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase();
    return costos.filter((c) => {
      if (filtroCuenta && c.accountId !== filtroCuenta) return false;
      if (filtroProyecto === EMPRESA && c.projectId !== null) return false;
      if (filtroProyecto && filtroProyecto !== EMPRESA && c.projectId !== filtroProyecto) return false;
      if (filtroEstatus === "COMPROMETIDO" && c.paidAt) return false;
      if (filtroEstatus === "PAGADO" && !c.paidAt) return false;
      const fecha = c.date.slice(0, 10);
      if (fechaDesde && fecha < fechaDesde) return false;
      if (fechaHasta && fecha > fechaHasta) return false;
      if (
        texto &&
        !c.description.toLowerCase().includes(texto) &&
        !(c.supplierName ?? "").toLowerCase().includes(texto) &&
        !(c.invoiceRef ?? "").toLowerCase().includes(texto)
      )
        return false;
      return true;
    });
  }, [costos, filtroCuenta, filtroProyecto, filtroEstatus, filtroTexto, fechaDesde, fechaHasta]);

  const totalComprometido = filtrados.filter((c) => !c.paidAt).reduce((acc, c) => acc + c.amount, 0);
  const totalPagado = filtrados.filter((c) => c.paidAt).reduce((acc, c) => acc + c.amount, 0);
  const total = totalComprometido + totalPagado;

  const secciones: SeccionFiltroConfig[] = [
    {
      tipo: "select",
      titulo: "Cuenta",
      opciones: [{ label: "Todas", value: "" }, ...cuentasSelect.map((c) => ({ label: `${c.code} ${c.name}`, value: c.id }))],
      valor: filtroCuenta,
      onCambio: setFiltroCuenta,
    },
    {
      tipo: "select",
      titulo: "Proyecto",
      opciones: [
        { label: "Todos", value: "" },
        { label: "— Gastos de empresa —", value: EMPRESA },
        ...proyectos.map((p) => ({ label: `${p.code} - ${p.name}`, value: p.id })),
      ],
      valor: filtroProyecto,
      onCambio: setFiltroProyecto,
    },
    {
      tipo: "select",
      titulo: "Estatus de pago",
      opciones: [
        { label: "Todos", value: "" },
        { label: "Comprometido", value: "COMPROMETIDO" },
        { label: "Pagado", value: "PAGADO" },
      ],
      valor: filtroEstatus,
      onCambio: setFiltroEstatus,
    },
    {
      tipo: "texto",
      titulo: "Buscar",
      placeholder: "Descripción, proveedor o folio...",
      valor: filtroTexto,
      onCambio: setFiltroTexto,
    },
  ];

  function limpiarFiltros() {
    setFiltroCuenta("");
    setFiltroProyecto("");
    setFiltroEstatus("");
    setFiltroTexto("");
    setFechaDesde("");
    setFechaHasta("");
  }

  function abrirCrear() {
    setForm(vacioForm());
    setPagado(false);
    setFormError(null);
    setModal({ open: true, modo: "crear" });
  }

  function abrirEditar(c: CostoDTO) {
    setForm({
      date: c.date.slice(0, 10),
      accountId: c.accountId,
      projectId: c.projectId,
      elementId: c.elementId,
      supplierName: c.supplierName ?? "",
      description: c.description,
      invoiceRef: c.invoiceRef ?? "",
      amount: c.amount,
      paidAt: c.paidAt ? c.paidAt.slice(0, 10) : null,
    });
    setPagado(!!c.paidAt);
    setFormError(null);
    setModal({ open: true, modo: "editar", costo: c });
  }

  function cerrarModal() {
    setModal({ open: false });
  }

  function cambiarCuenta(accountId: string) {
    const cuenta = cuentasPorId.get(accountId);
    setForm((prev) => ({
      ...prev,
      accountId,
      projectId: cuenta?.isProject ? prev.projectId : null,
      elementId: cuenta?.isProject ? prev.elementId : null,
    }));
  }

  function cambiarProyecto(projectId: string) {
    setForm((prev) => ({ ...prev, projectId: projectId || null, elementId: null }));
  }

  async function handleGuardar() {
    const datosFinal: CostoFormInput = { ...form, paidAt: pagado ? form.paidAt || hoy() : null };
    const cuenta = cuentasPorId.get(datosFinal.accountId);
    const error = validarCosto(datosFinal, cuenta);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setCargando(true);

    const result =
      modal.open && modal.modo === "editar"
        ? await actualizarCostoAction(modal.costo.id, clienteId, datosFinal)
        : await crearCostoAction(clienteId, datosFinal);

    setCargando(false);
    if (!result.ok) {
      setFormError(result.error ?? "Error al guardar.");
      toast.error(result.error ?? "No se pudo guardar el costo.");
      return;
    }
    toast.success(modal.open && modal.modo === "editar" ? "Costo actualizado correctamente" : "Costo creado correctamente");
    cerrarModal();
    router.refresh();
  }

  async function handleEliminar(id: string) {
    setCargando(true);
    setBannerError(null);
    const result = await eliminarCostoAction(id);
    setCargando(false);
    setConfirmandoId(null);
    if (!result.ok) {
      setBannerError(result.error ?? "Error al eliminar.");
      toast.error(result.error ?? "No se pudo eliminar el costo.");
      return;
    }
    toast.success("Costo eliminado correctamente");
    router.refresh();
  }

  const cuentaSeleccionada = cuentasPorId.get(form.accountId);
  const elementosDelProyecto = elementos.filter((e) => e.projectId === form.projectId);

  const INPUT =
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">Costos reales capturados: obra e institucionales</p>
        <div className="flex items-center gap-2">
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs" />
          <span className="text-xs text-zinc-400">a</span>
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs" />
          <PanelFiltros secciones={secciones} onLimpiar={limpiarFiltros} />
          {permiso.crear && (
            <button
              type="button"
              onClick={abrirCrear}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-dark"
            >
              <IconPlus className="h-4 w-4" />
              Capturar costo
            </button>
          )}
        </div>
      </div>

      {bannerError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{bannerError}</div>
      )}

      <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="px-4 py-2">
            <EmptyState icon="IconReceipt2" title="Sin costos" description="No hay costos que coincidan con el filtro." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Cuenta</th>
                  <th className="px-3 py-2.5">Proyecto</th>
                  <th className="px-3 py-2.5">Elemento</th>
                  <th className="px-3 py-2.5">Proveedor</th>
                  <th className="px-3 py-2.5">Descripción</th>
                  <th className="px-3 py-2.5">Importe</th>
                  <th className="px-3 py-2.5">Estatus</th>
                  <th className="px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtrados.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                    <td className="px-3 py-2 text-zinc-600">{formatFecha(c.date)}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs text-zinc-400">{c.accountCode}</span>{" "}
                      <span className="text-zinc-700">{c.accountName}</span>
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{c.projectName ?? "— Empresa —"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-500">{c.elementCode ?? "—"}</td>
                    <td className="px-3 py-2 text-zinc-600">{c.supplierName ?? "—"}</td>
                    <td className="px-3 py-2 text-zinc-600">{c.description}</td>
                    <td className="px-3 py-2 text-zinc-800">{formatImporte(c.amount, "MXN")}</td>
                    <td className="px-3 py-2">
                      <Badge variant={c.paidAt ? "success" : "warning"}>{c.paidAt ? "Pagado" : "Comprometido"}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {confirmandoId === c.id ? (
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <span className="text-zinc-500">¿Eliminar?</span>
                          <button type="button" disabled={cargando} onClick={() => handleEliminar(c.id)} className="font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">Sí</button>
                          <button type="button" onClick={() => setConfirmandoId(null)} className="text-zinc-400 hover:text-zinc-600">No</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {permiso.editar && (
                            <button type="button" onClick={() => abrirEditar(c)} title="Editar" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                              <IconPencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {permiso.eliminar && (
                            <button type="button" onClick={() => setConfirmandoId(c.id)} title="Eliminar" className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600">
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-surface-muted text-xs font-semibold text-zinc-700">
                  <td className="px-3 py-2.5" colSpan={6}>Totales del filtro</td>
                  <td className="px-3 py-2.5">{formatImporte(total, "MXN")}</td>
                  <td className="px-3 py-2.5" colSpan={2}>
                    Comprometido {formatImporte(totalComprometido, "MXN")} · Pagado {formatImporte(totalPagado, "MXN")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {modal.open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <h2 className="text-base font-semibold text-zinc-900">
                {modal.modo === "crear" ? "Capturar costo" : "Editar costo"}
              </h2>

              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Fecha <span className="text-red-500">*</span></label>
                    <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className={INPUT} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Importe <span className="text-red-500">*</span></label>
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

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Cuenta <span className="text-red-500">*</span></label>
                  <select value={form.accountId} onChange={(e) => cambiarCuenta(e.target.value)} className={INPUT}>
                    <option value="">Selecciona una cuenta...</option>
                    {cuentasSelect.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>

                {cuentaSeleccionada?.isProject && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700">Proyecto <span className="text-red-500">*</span></label>
                      <select value={form.projectId ?? ""} onChange={(e) => cambiarProyecto(e.target.value)} className={INPUT}>
                        <option value="">Selecciona un proyecto...</option>
                        {proyectos.map((p) => (
                          <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                        ))}
                      </select>
                    </div>
                    {form.projectId && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">Elemento (opcional)</label>
                        <select value={form.elementId ?? ""} onChange={(e) => setForm((p) => ({ ...p, elementId: e.target.value || null }))} className={INPUT}>
                          <option value="">Sin elemento específico</option>
                          {elementosDelProyecto.map((el) => (
                            <option key={el.id} value={el.id}>{el.code} - {el.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Proveedor</label>
                  <input type="text" value={form.supplierName ?? ""} onChange={(e) => setForm((p) => ({ ...p, supplierName: e.target.value }))} className={INPUT} />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Descripción <span className="text-red-500">*</span></label>
                  <input type="text" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={INPUT} />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Folio de factura</label>
                  <input type="text" value={form.invoiceRef ?? ""} onChange={(e) => setForm((p) => ({ ...p, invoiceRef: e.target.value }))} className={INPUT} />
                </div>

                <div className="space-y-2 rounded-md border border-zinc-100 p-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={pagado} onChange={(e) => setPagado(e.target.checked)} className="rounded border-zinc-300" />
                    <span className="text-sm text-zinc-700">Ya se pagó</span>
                  </label>
                  {pagado && (
                    <input
                      type="date"
                      value={form.paidAt ?? hoy()}
                      onChange={(e) => setForm((p) => ({ ...p, paidAt: e.target.value }))}
                      className={INPUT}
                    />
                  )}
                </div>
              </div>

              {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={cerrarModal} disabled={cargando} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
                  Cancelar
                </button>
                <button type="button" onClick={handleGuardar} disabled={cargando} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-dark disabled:opacity-50">
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
