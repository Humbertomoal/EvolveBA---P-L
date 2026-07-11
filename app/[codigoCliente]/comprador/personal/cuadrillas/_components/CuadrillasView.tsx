"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconEye, IconPencil, IconPlus } from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { CuadrillaDTO, EmpleadoDTO } from "@/src/lib/personalTypes";
import {
  crearCuadrillaAction,
  actualizarCuadrillaAction,
  toggleActivaCuadrillaAction,
} from "@/src/lib/personalActions";
import { usePageTitle } from "@/app/_components/PageHeaderContext";
import EmptyState from "@/src/components/EmptyState";

type ModalState =
  | { open: false }
  | { open: true; modo: "crear" }
  | { open: true; modo: "editar"; cuadrilla: CuadrillaDTO };

export default function CuadrillasView({
  cuadrillas,
  lideresDisponibles,
  clienteId,
  basePath,
}: {
  cuadrillas: CuadrillaDTO[];
  lideresDisponibles: EmpleadoDTO[];
  clienteId: string;
  basePath: string;
}) {
  const router = useRouter();
  usePageTitle("Cuadrillas");

  const [modal, setModal] = useState<ModalState>({ open: false });
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const [formName, setFormName] = useState("");
  const [formLeaderId, setFormLeaderId] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  function abrirCrear() {
    setFormName("");
    setFormLeaderId(lideresDisponibles[0]?.id ?? "");
    setFormActive(true);
    setFormError(null);
    setBannerError(null);
    setModal({ open: true, modo: "crear" });
  }

  function abrirEditar(c: CuadrillaDTO) {
    setFormName(c.name);
    setFormLeaderId(c.leaderId);
    setFormActive(c.active);
    setFormError(null);
    setBannerError(null);
    setModal({ open: true, modo: "editar", cuadrilla: c });
  }

  function cerrarModal() {
    setModal({ open: false });
    setFormError(null);
  }

  async function handleGuardar() {
    if (!formName.trim()) {
      setFormError("El nombre es requerido.");
      return;
    }
    if (!formLeaderId) {
      setFormError("Selecciona un jefe de cuadrilla.");
      return;
    }
    setFormError(null);
    setCargando(true);

    const datos = { name: formName.trim(), leaderId: formLeaderId, active: formActive };

    if (!modal.open) {
      setCargando(false);
      return;
    }

    let result: { ok: boolean; error?: string };
    if (modal.modo === "crear") {
      result = await crearCuadrillaAction(clienteId, datos);
    } else {
      result = await actualizarCuadrillaAction(modal.cuadrilla.id, datos);
    }

    setCargando(false);
    if (!result.ok) {
      setFormError(result.error ?? "Error al guardar.");
      toast.error(result.error ?? "No se pudo guardar la cuadrilla.");
      return;
    }
    toast.success(modal.modo === "crear" ? "Cuadrilla creada correctamente" : "Cuadrilla actualizada correctamente");
    cerrarModal();
    router.refresh();
  }

  async function handleToggleActiva(id: string, active: boolean) {
    await toggleActivaCuadrillaAction(id, !active);
    toast.success(active ? "Cuadrilla desactivada" : "Cuadrilla activada");
    router.refresh();
  }

  const INPUT =
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="mt-0.5 text-sm text-zinc-500">Administra las cuadrillas de campo</p>
        <button
          type="button"
          onClick={abrirCrear}
          className="flex items-center gap-1.5 rounded-md bg-[var(--color-primario)] px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--color-secundario)]"
        >
          <IconPlus className="h-4 w-4" />
          Agregar cuadrilla
        </button>
      </div>

      {bannerError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex-1">{bannerError}</span>
          <button type="button" onClick={() => setBannerError(null)} className="shrink-0 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
        {cuadrillas.length === 0 ? (
          <div className="px-4 py-2">
            <EmptyState
              icon="IconUsersGroup"
              title="Sin cuadrillas"
              description="Agrega la primera cuadrilla. Necesitas al menos un empleado marcado como jefe."
              actionLabel="Agregar cuadrilla"
              onAction={abrirCrear}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Jefe</th>
                  <th className="px-4 py-3">Integrantes</th>
                  <th className="px-4 py-3">Activa</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {cuadrillas.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                    <td className="px-4 py-3 font-medium text-zinc-800">{c.name}</td>
                    <td className="px-4 py-3 text-zinc-600">{c.leaderNombre}</td>
                    <td className="px-4 py-3 text-zinc-600">{c.miembrosCount}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActiva(c.id, c.active)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-150 ${c.active ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      >
                        {c.active ? "Activa" : "Inactiva"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`${basePath}/comprador/personal/cuadrillas/${c.id}`}
                          title="Ver integrantes"
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors duration-150"
                        >
                          <IconEye className="h-3.5 w-3.5" />
                        </Link>
                        <button type="button" onClick={() => abrirEditar(c)} title="Editar" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors duration-150">
                          <IconPencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-zinc-900">
              {modal.modo === "crear" ? "Agregar cuadrilla" : "Editar cuadrilla"}
            </h2>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Nombre <span className="text-red-500">*</span></label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className={INPUT} autoFocus />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Jefe de cuadrilla <span className="text-red-500">*</span></label>
                <select value={formLeaderId} onChange={(e) => setFormLeaderId(e.target.value)} className={INPUT}>
                  <option value="">Seleccionar jefe...</option>
                  {lideresDisponibles.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                {lideresDisponibles.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No hay empleados marcados como &quot;Puede ser jefe de cuadrilla&quot;. Márcalo primero en Empleados.
                  </p>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="rounded border-zinc-300" />
                <span className="text-sm text-zinc-700">Activa</span>
              </label>
            </div>

            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={cerrarModal} disabled={cargando} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
                Cancelar
              </button>
              <button type="button" onClick={handleGuardar} disabled={cargando} className="rounded-md bg-[var(--color-primario)] px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--color-secundario)] disabled:opacity-50">
                {cargando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
