"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { EmpleadoDTO, CuadrillaDTO } from "@/src/lib/personalTypes";
import type { CatalogoOpcion } from "@/src/lib/getCatalogos";
import {
  crearEmpleadoAction,
  actualizarEmpleadoAction,
  toggleActivoEmpleadoAction,
  eliminarEmpleadoAction,
} from "@/src/lib/personalActions";
import { usePageTitle } from "@/app/_components/PageHeaderContext";
import EmptyState from "@/src/components/EmptyState";
import PanelFiltros, { type SeccionFiltroConfig } from "@/app/_components/PanelFiltros";

const SIN_CUADRILLA = "__sin__";

type ModalState =
  | { open: false }
  | { open: true; modo: "crear" }
  | { open: true; modo: "editar"; empleado: EmpleadoDTO };

export default function EmpleadosView({
  empleados,
  cuadrillas,
  rolesEmpleado,
  clienteId,
}: {
  empleados: EmpleadoDTO[];
  cuadrillas: CuadrillaDTO[];
  rolesEmpleado: CatalogoOpcion[];
  clienteId: string;
}) {
  const router = useRouter();
  usePageTitle("Empleados");

  const [filtroCuadrilla, setFiltroCuadrilla] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("");

  const [modal, setModal] = useState<ModalState>({ open: false });
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formHourlyCost, setFormHourlyCost] = useState("");
  const [formIsLeader, setFormIsLeader] = useState(false);
  const [formCrewId, setFormCrewId] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const empleadosFiltrados = useMemo(() => {
    return empleados.filter((e) => {
      if (filtroCuadrilla === SIN_CUADRILLA && e.crewId) return false;
      if (filtroCuadrilla && filtroCuadrilla !== SIN_CUADRILLA && e.crewId !== filtroCuadrilla) return false;
      if (filtroRol && e.role !== filtroRol) return false;
      if (filtroActivo === "activos" && !e.active) return false;
      if (filtroActivo === "inactivos" && e.active) return false;
      return true;
    });
  }, [empleados, filtroCuadrilla, filtroRol, filtroActivo]);

  const secciones: SeccionFiltroConfig[] = [
    {
      tipo: "select",
      titulo: "Cuadrilla",
      opciones: [
        { label: "Todas", value: "" },
        { label: "Sin cuadrilla", value: SIN_CUADRILLA },
        ...cuadrillas.map((c) => ({ label: c.name, value: c.id })),
      ],
      valor: filtroCuadrilla,
      onCambio: setFiltroCuadrilla,
    },
    {
      tipo: "select",
      titulo: "Rol",
      opciones: [
        { label: "Todos", value: "" },
        ...rolesEmpleado.map((r) => ({ label: r.nombre, value: r.nombre })),
      ],
      valor: filtroRol,
      onCambio: setFiltroRol,
    },
    {
      tipo: "select",
      titulo: "Estado",
      opciones: [
        { label: "Todos", value: "" },
        { label: "Activos", value: "activos" },
        { label: "Inactivos", value: "inactivos" },
      ],
      valor: filtroActivo,
      onCambio: setFiltroActivo,
    },
  ];

  function limpiarFiltros() {
    setFiltroCuadrilla("");
    setFiltroRol("");
    setFiltroActivo("");
  }

  function abrirCrear() {
    setFormCode("");
    setFormName("");
    setFormRole(rolesEmpleado[0]?.nombre ?? "");
    setFormHourlyCost("");
    setFormIsLeader(false);
    setFormCrewId("");
    setFormActive(true);
    setFormError(null);
    setBannerError(null);
    setModal({ open: true, modo: "crear" });
  }

  function abrirEditar(e: EmpleadoDTO) {
    setFormCode(e.code ?? "");
    setFormName(e.name);
    setFormRole(e.role ?? "");
    setFormHourlyCost(e.hourlyCost);
    setFormIsLeader(e.isLeader);
    setFormCrewId(e.crewId ?? "");
    setFormActive(e.active);
    setFormError(null);
    setBannerError(null);
    setModal({ open: true, modo: "editar", empleado: e });
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
    const hourlyCost = parseFloat(formHourlyCost);
    if (isNaN(hourlyCost) || hourlyCost < 0) {
      setFormError("El costo por hora debe ser un número válido.");
      return;
    }
    setFormError(null);
    setCargando(true);

    const datos = {
      code: formCode.trim() || null,
      name: formName.trim(),
      role: formRole || null,
      hourlyCost,
      isLeader: formIsLeader,
      crewId: formCrewId || null,
      active: formActive,
    };

    if (!modal.open) {
      setCargando(false);
      return;
    }

    let result: { ok: boolean; error?: string };
    if (modal.modo === "crear") {
      result = await crearEmpleadoAction(clienteId, datos);
    } else {
      result = await actualizarEmpleadoAction(modal.empleado.id, datos);
    }

    setCargando(false);
    if (!result.ok) {
      setFormError(result.error ?? "Error al guardar.");
      toast.error(result.error ?? "No se pudo guardar el empleado.");
      return;
    }
    toast.success(modal.modo === "crear" ? "Empleado creado correctamente" : "Empleado actualizado correctamente");
    cerrarModal();
    router.refresh();
  }

  async function handleToggleActivo(id: string, active: boolean) {
    await toggleActivoEmpleadoAction(id, !active);
    toast.success(active ? "Empleado desactivado" : "Empleado activado");
    router.refresh();
  }

  async function handleEliminar(id: string) {
    setCargando(true);
    setBannerError(null);
    const result = await eliminarEmpleadoAction(id);
    setCargando(false);
    setConfirmandoId(null);
    if (!result.ok) {
      setBannerError(result.error ?? "Error al eliminar.");
      toast.error(result.error ?? "No se pudo eliminar el empleado.");
      return;
    }
    toast.success("Empleado eliminado correctamente");
    router.refresh();
  }

  const INPUT =
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="mt-0.5 text-sm text-zinc-500">Administra la plantilla de empleados</p>
        <div className="flex items-center gap-2">
          <PanelFiltros secciones={secciones} onLimpiar={limpiarFiltros} />
          <button
            type="button"
            onClick={abrirCrear}
            className="flex items-center gap-1.5 rounded-md bg-[var(--color-primario)] px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--color-secundario)]"
          >
            <IconPlus className="h-4 w-4" />
            Agregar empleado
          </button>
        </div>
      </div>

      {bannerError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex-1">{bannerError}</span>
          <button type="button" onClick={() => setBannerError(null)} className="shrink-0 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
        {empleadosFiltrados.length === 0 ? (
          <div className="px-4 py-2">
            <EmptyState
              icon="IconUsers"
              title="Sin empleados"
              description="Agrega el primer empleado de la plantilla."
              actionLabel="Agregar empleado"
              onAction={abrirCrear}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Cuadrilla</th>
                  <th className="px-4 py-3">Costo/hora</th>
                  <th className="px-4 py-3">Activo</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {empleadosFiltrados.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{e.code ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-800">{e.name}</span>
                      {e.isLeader && (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          Jefe
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{e.role ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{e.crewNombre ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">${e.hourlyCost}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActivo(e.id, e.active)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-150 ${e.active ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      >
                        {e.active ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {confirmandoId === e.id ? (
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <span className="text-zinc-500">¿Eliminar?</span>
                          <button type="button" disabled={cargando} onClick={() => handleEliminar(e.id)} className="font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">Sí</button>
                          <button type="button" onClick={() => setConfirmandoId(null)} className="text-zinc-400 hover:text-zinc-600">No</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => abrirEditar(e)} title="Editar" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors duration-150">
                            <IconPencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setConfirmandoId(e.id)} title="Eliminar" className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors duration-150">
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
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
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-zinc-900">
              {modal.modo === "crear" ? "Agregar empleado" : "Editar empleado"}
            </h2>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Código</label>
                  <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value)} className={INPUT} autoFocus />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Nombre <span className="text-red-500">*</span></label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className={INPUT} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Rol</label>
                  <select value={formRole} onChange={(e) => setFormRole(e.target.value)} className={INPUT}>
                    <option value="">Sin rol</option>
                    {rolesEmpleado.map((r) => (
                      <option key={r.codigo} value={r.nombre}>{r.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Costo/hora (MXN) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formHourlyCost}
                    onChange={(e) => setFormHourlyCost(e.target.value)}
                    className={INPUT}
                  />
                  <p className="mt-1 text-xs text-amber-600">
                    ⚠️ Cambiar este valor NO recalcula las horas ya capturadas — solo aplica a partir de ahora.
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Cuadrilla</label>
                <select value={formCrewId} onChange={(e) => setFormCrewId(e.target.value)} className={INPUT}>
                  <option value="">Sin cuadrilla</option>
                  {cuadrillas.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-6">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={formIsLeader} onChange={(e) => setFormIsLeader(e.target.checked)} className="rounded border-zinc-300" />
                  <span className="text-sm text-zinc-700">Puede ser jefe de cuadrilla</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="rounded border-zinc-300" />
                  <span className="text-sm text-zinc-700">Activo</span>
                </label>
              </div>
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
