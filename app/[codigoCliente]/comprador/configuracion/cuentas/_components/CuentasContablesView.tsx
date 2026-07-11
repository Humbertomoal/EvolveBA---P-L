"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { IconLock, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { CostAccountDTO, CostAccountFormInput } from "@/src/lib/costAccountTypes";
import { NIVEL_LABEL, construirArbolCuentas, type CostAccountNodo } from "@/src/lib/costAccountTypes";
import {
  crearCostAccountAction,
  actualizarCostAccountAction,
  eliminarCostAccountAction,
} from "@/src/lib/costAccountActions";
import { usePageTitle } from "@/app/_components/PageHeaderContext";
import Badge from "@/src/components/Badge";

type ModalState =
  | { open: false }
  | { open: true; modo: "crear"; grupo: CostAccountNodo }
  | { open: true; modo: "editar"; cuenta: CostAccountDTO; grupo: CostAccountNodo };

export default function CuentasContablesView({
  cuentas,
  clienteId,
  permiso,
}: {
  cuentas: CostAccountDTO[];
  clienteId: string;
  permiso: { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean };
}) {
  const router = useRouter();
  usePageTitle("Cuentas contables");

  const arbol = construirArbolCuentas(cuentas);

  const [modal, setModal] = useState<ModalState>({ open: false });
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formOrder, setFormOrder] = useState(0);
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  function abrirCrear(grupo: CostAccountNodo) {
    setFormCode("");
    setFormName("");
    setFormOrder(grupo.hijos.length + 1);
    setFormActive(true);
    setFormError(null);
    setModal({ open: true, modo: "crear", grupo });
  }

  function abrirEditar(cuenta: CostAccountDTO, grupo: CostAccountNodo) {
    setFormCode(cuenta.code);
    setFormName(cuenta.name);
    setFormOrder(cuenta.order);
    setFormActive(cuenta.active);
    setFormError(null);
    setModal({ open: true, modo: "editar", cuenta, grupo });
  }

  function cerrarModal() {
    setModal({ open: false });
  }

  async function handleGuardar() {
    if (!modal.open) return;
    if (!formCode.trim()) {
      setFormError("El código es requerido.");
      return;
    }
    if (!formName.trim()) {
      setFormError("El nombre es requerido.");
      return;
    }
    setFormError(null);
    setCargando(true);

    const datos: CostAccountFormInput = {
      code: formCode.trim(),
      name: formName.trim(),
      level: modal.grupo.level,
      parentId: modal.grupo.id,
      order: formOrder,
      isProject: modal.grupo.isProject,
      active: formActive,
    };

    const result =
      modal.modo === "crear"
        ? await crearCostAccountAction(clienteId, datos)
        : await actualizarCostAccountAction(modal.cuenta.id, clienteId, datos);

    setCargando(false);
    if (!result.ok) {
      setFormError(result.error ?? "Error al guardar.");
      toast.error(result.error ?? "No se pudo guardar la cuenta.");
      return;
    }
    toast.success(modal.modo === "crear" ? "Cuenta creada correctamente" : "Cuenta actualizada correctamente");
    cerrarModal();
    router.refresh();
  }

  async function handleEliminar(id: string) {
    setCargando(true);
    setBannerError(null);
    const result = await eliminarCostAccountAction(id, clienteId);
    setCargando(false);
    setConfirmandoId(null);
    if (!result.ok) {
      setBannerError(result.error ?? "Error al eliminar.");
      toast.error(result.error ?? "No se pudo eliminar la cuenta.");
      return;
    }
    toast.success("Cuenta eliminada correctamente");
    router.refresh();
  }

  const INPUT =
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";

  return (
    <div className="max-w-4xl space-y-6">
      <p className="text-sm text-zinc-500">
        Catálogo de cuentas contables. Las cuentas marcadas como "Calculada automáticamente" no se
        capturan a mano: su valor viene de horas-hombre o de nómina.
      </p>

      {bannerError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {bannerError}
        </div>
      )}

      <div className="space-y-4">
        {arbol.map((grupo) => (
          <div key={grupo.id} className="rounded-card border border-border bg-white shadow-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
              <div>
                <span className="font-mono text-xs text-zinc-400">{grupo.code}</span>
                <span className="ml-2 text-sm font-semibold text-zinc-800">
                  {grupo.name}
                </span>
                <Badge variant={grupo.isProject ? "info" : "neutral"} className="ml-2">
                  {grupo.isProject ? "Va a proyecto" : "Nivel empresa"}
                </Badge>
              </div>
              {permiso.crear && (
                <button
                  type="button"
                  onClick={() => abrirCrear(grupo)}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-dark"
                >
                  <IconPlus className="h-4 w-4" />
                  Agregar cuenta
                </button>
              )}
            </div>

            <table className="w-full text-sm">
              <tbody className="divide-y divide-zinc-100">
                {grupo.hijos.map((h) => (
                  <tr key={h.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                    <td className="w-24 px-4 py-2.5 font-mono text-xs text-zinc-500">{h.code}</td>
                    <td className="px-4 py-2.5 text-zinc-800">{h.name}</td>
                    <td className="px-4 py-2.5">
                      {h.isSystem ? (
                        <Badge variant="warning">
                          <IconLock className="h-3 w-3" />
                          Calculada automáticamente
                        </Badge>
                      ) : (
                        <Badge variant={h.active ? "success" : "neutral"}>
                          {h.active ? "Activa" : "Inactiva"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {h.isSystem ? (
                        <span className="text-xs text-zinc-400">—</span>
                      ) : confirmandoId === h.id ? (
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <span className="text-zinc-500">¿Eliminar?</span>
                          <button
                            type="button"
                            disabled={cargando}
                            onClick={() => handleEliminar(h.id)}
                            className="font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            Sí
                          </button>
                          <button type="button" onClick={() => setConfirmandoId(null)} className="text-zinc-400 hover:text-zinc-600">
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {permiso.editar && (
                            <button
                              type="button"
                              onClick={() => abrirEditar(h, grupo)}
                              title="Editar"
                              className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                            >
                              <IconPencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {permiso.eliminar && (
                            <button
                              type="button"
                              onClick={() => setConfirmandoId(h.id)}
                              title="Eliminar"
                              className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                            >
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
          </div>
        ))}
      </div>

      {modal.open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h2 className="text-base font-semibold text-zinc-900">
                {modal.modo === "crear" ? "Agregar cuenta" : "Editar cuenta"}
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                {NIVEL_LABEL[modal.grupo.level]} ({modal.grupo.code})
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Código <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder={`Ej. ${modal.grupo.code}.${modal.grupo.hijos.length + 1}`}
                    className={INPUT}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Orden</label>
                  <input
                    type="number"
                    value={formOrder}
                    onChange={(e) => setFormOrder(parseInt(e.target.value, 10) || 0)}
                    className={INPUT}
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded border-zinc-300"
                  />
                  <span className="text-sm text-zinc-700">Activa</span>
                </label>
              </div>

              {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={cargando}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
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
          </div>,
          document.body
        )}
    </div>
  );
}
