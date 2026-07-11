"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IconPlus } from "@tabler/icons-react";
import type { ElementTypeDTO } from "@/src/lib/elementTypesTypes";
import { formatPeso, formatPrecio } from "@/src/lib/elementTypesTypes";
import type { CatalogoOpcion } from "@/src/lib/getCatalogos";
import ElementoTypeFormFields from "../../elementos/_components/ElementoTypeFormFields";

/**
 * Selector puro (igual que AsignarPersonalModal): no persiste nada, solo
 * devuelve los ElementType elegidos. Cada Aceptar es una selección nueva —
 * el mismo tipo se puede agregar varias veces reabriendo el modal, porque el
 * llamador APPENDEA renglones en vez de reemplazar un conjunto.
 */
export default function SeleccionarElementosModal({
  tiposIniciales,
  familias,
  clienteId,
  puedeCrearTipo,
  onCerrar,
  onAceptar,
}: {
  tiposIniciales: ElementTypeDTO[];
  familias: CatalogoOpcion[];
  clienteId: string;
  puedeCrearTipo: boolean;
  onCerrar: () => void;
  onAceptar: (tipos: ElementTypeDTO[]) => void;
}) {
  const [tipos, setTipos] = useState<ElementTypeDTO[]>(tiposIniciales);
  const [filtroFamilia, setFiltroFamilia] = useState("");
  const [filtroMaterial, setFiltroMaterial] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);

  const materiales = useMemo(() => {
    const unicos = new Set(tipos.map((t) => t.material).filter((m): m is string => !!m));
    return Array.from(unicos).sort((a, b) => a.localeCompare(b));
  }, [tipos]);

  const visibles = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase();
    return tipos.filter((t) => {
      if (filtroFamilia && t.family !== filtroFamilia) return false;
      if (filtroMaterial && t.material !== filtroMaterial) return false;
      if (texto && !t.code.toLowerCase().includes(texto) && !t.name.toLowerCase().includes(texto)) return false;
      return true;
    });
  }, [tipos, filtroFamilia, filtroMaterial, filtroTexto]);

  function toggle(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function seleccionarTodosVisibles() {
    setSeleccionados((prev) => new Set([...prev, ...visibles.map((t) => t.id)]));
  }

  function deseleccionarTodosVisibles() {
    const visiblesIds = new Set(visibles.map((t) => t.id));
    setSeleccionados((prev) => new Set([...prev].filter((id) => !visiblesIds.has(id))));
  }

  function handleTipoCreado(nuevo: ElementTypeDTO) {
    setTipos((prev) => [...prev, nuevo]);
    setSeleccionados((prev) => new Set([...prev, nuevo.id]));
    setModalCrearAbierto(false);
  }

  const INPUT =
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white p-6 shadow-xl">
        <div className="flex shrink-0 items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Agregar elementos</h2>
          {puedeCrearTipo && (
            <button
              type="button"
              onClick={() => setModalCrearAbierto(true)}
              className="flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5"
            >
              <IconPlus className="h-4 w-4" />
              Crear nuevo tipo
            </button>
          )}
        </div>

        <div className="mt-4 grid shrink-0 grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Familia</label>
            <select value={filtroFamilia} onChange={(e) => setFiltroFamilia(e.target.value)} className={INPUT}>
              <option value="">Todas</option>
              {familias.map((f) => (
                <option key={f.codigo} value={f.nombre}>{f.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Material</label>
            <select value={filtroMaterial} onChange={(e) => setFiltroMaterial(e.target.value)} className={INPUT}>
              <option value="">Todos</option>
              {materiales.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Buscar</label>
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Código o nombre..."
              className={INPUT}
            />
          </div>
        </div>

        <div className="mt-3 flex shrink-0 items-center justify-between border-t border-zinc-100 pt-3">
          <div className="flex gap-2">
            <button type="button" onClick={seleccionarTodosVisibles} className="text-xs font-medium text-primary hover:underline">
              Seleccionar todos
            </button>
            <span className="text-xs text-zinc-300">·</span>
            <button type="button" onClick={deseleccionarTodosVisibles} className="text-xs font-medium text-zinc-500 hover:underline">
              Deseleccionar todos
            </button>
          </div>
          <span className="text-xs font-medium text-zinc-600">
            {seleccionados.size} seleccionado{seleccionados.size !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto">
          {visibles.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">Sin elementos que coincidan con el filtro.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                  <th className="w-8 px-2 py-2"></th>
                  <th className="px-2 py-2">Código</th>
                  <th className="px-2 py-2">Nombre</th>
                  <th className="px-2 py-2">Familia</th>
                  <th className="px-2 py-2">Material</th>
                  <th className="px-2 py-2">Peso</th>
                  <th className="px-2 py-2">Precio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {visibles.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    className="cursor-pointer hover:bg-zinc-50/50 transition-colors duration-150"
                  >
                    <td className="px-2 py-2">
                      <input type="checkbox" checked={seleccionados.has(t.id)} onChange={() => toggle(t.id)} className="h-4 w-4 rounded border-zinc-300" />
                    </td>
                    <td className="px-2 py-2 font-mono text-xs text-zinc-500">{t.code}</td>
                    <td className="px-2 py-2 text-zinc-800">{t.name}</td>
                    <td className="px-2 py-2 text-zinc-600">{t.family}</td>
                    <td className="px-2 py-2 text-zinc-600">{t.material ?? "—"}</td>
                    <td className="px-2 py-2 text-zinc-600">{formatPeso(t.weightValue, t.weightUnit)}</td>
                    <td className="px-2 py-2 text-zinc-600">{formatPrecio(t.estimatedPrice, t.priceUnit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-zinc-100 pt-4">
          <button type="button" onClick={onCerrar} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onAceptar(tipos.filter((t) => seleccionados.has(t.id)))}
            disabled={seleccionados.size === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-dark disabled:opacity-50"
          >
            Aceptar
          </button>
        </div>
      </div>

      {modalCrearAbierto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-zinc-900">Crear nuevo tipo de elemento</h2>
            <ElementoTypeFormFields
              modo="crear"
              familias={familias}
              clienteId={clienteId}
              onGuardado={handleTipoCreado}
              onCancelar={() => setModalCrearAbierto(false)}
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
