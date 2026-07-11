"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { ElementTypeDetalleDTO, ElementTypeDTO } from "@/src/lib/elementTypesTypes";
import { WEIGHT_UNITS, PRICE_UNITS } from "@/src/lib/elementTypesTypes";
import type { CatalogoOpcion } from "@/src/lib/getCatalogos";
import { crearElementTypeAction, actualizarElementTypeAction } from "@/src/lib/elementTypesActions";

const INPUT =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-zinc-400";
const LABEL = "mb-1 block text-sm font-medium text-zinc-700";

function numOrEmpty(n: number | null | undefined) {
  return n === null || n === undefined ? "" : String(n);
}

/**
 * Núcleo del formulario de ElementType: campos + validación + llamada al
 * server action. Sin usePageTitle ni navegación — eso lo decide el llamador
 * vía onGuardado/onCancelar. Se usa tal cual desde la página de Fase 3
 * (ElementoTypeForm) y desde el modal "crear tipo al vuelo" de Fase 4
 * (SeleccionarElementosModal), para no duplicar el formulario en dos lugares.
 */
export default function ElementoTypeFormFields({
  modo,
  elemento,
  familias,
  clienteId,
  onGuardado,
  onCancelar,
}: {
  modo: "crear" | "editar";
  elemento?: ElementTypeDetalleDTO;
  familias: CatalogoOpcion[];
  clienteId: string;
  onGuardado: (elementType: ElementTypeDTO) => void;
  onCancelar: () => void;
}) {
  const [code, setCode] = useState(elemento?.code ?? "");
  const [name, setName] = useState(elemento?.name ?? "");
  const [family, setFamily] = useState(elemento?.family ?? familias[0]?.nombre ?? "");
  const [description, setDescription] = useState(elemento?.description ?? "");
  const [material, setMaterial] = useState(elemento?.material ?? "");
  const [section, setSection] = useState(elemento?.section ?? "");

  const [lengthM, setLengthM] = useState(numOrEmpty(elemento?.lengthM));
  const [widthMm, setWidthMm] = useState(numOrEmpty(elemento?.widthMm));
  const [heightMm, setHeightMm] = useState(numOrEmpty(elemento?.heightMm));
  const [thicknessMm, setThicknessMm] = useState(numOrEmpty(elemento?.thicknessMm));
  const [diameterMm, setDiameterMm] = useState(numOrEmpty(elemento?.diameterMm));

  const [weightUnit, setWeightUnit] = useState(elemento?.weightUnit ?? "KG_M");
  const [weightValue, setWeightValue] = useState(elemento ? String(elemento.weightValue) : "");
  const [priceUnit, setPriceUnit] = useState(elemento?.priceUnit ?? "KG");
  const [estimatedPrice, setEstimatedPrice] = useState(elemento ? String(elemento.estimatedPrice) : "");
  const [paintAreaM2, setPaintAreaM2] = useState(numOrEmpty(elemento?.paintAreaM2));
  const [notes, setNotes] = useState(elemento?.notes ?? "");
  const [active, setActive] = useState(elemento?.active ?? true);

  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function parseOpcional(v: string): number | null {
    if (!v.trim()) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const datos = {
      code,
      name,
      family,
      description: description || null,
      material: material || null,
      section: section || null,
      lengthM: parseOpcional(lengthM),
      widthMm: parseOpcional(widthMm),
      heightMm: parseOpcional(heightMm),
      thicknessMm: parseOpcional(thicknessMm),
      diameterMm: parseOpcional(diameterMm),
      weightUnit,
      weightValue: parseFloat(weightValue),
      priceUnit,
      estimatedPrice: parseFloat(estimatedPrice),
      paintAreaM2: parseOpcional(paintAreaM2),
      notes: notes || null,
      active,
    };

    const result =
      modo === "crear"
        ? await crearElementTypeAction(clienteId, datos)
        : await actualizarElementTypeAction(elemento!.id, clienteId, datos);

    setCargando(false);
    if (!result.ok || !result.elementType) {
      setError(result.error ?? "Error al guardar.");
      toast.error(result.error ?? "No se pudo guardar el elemento.");
      return;
    }
    toast.success(modo === "crear" ? "Elemento creado correctamente" : "Elemento actualizado correctamente");
    onGuardado(result.elementType);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            <label className={LABEL}>Familia <span className="text-red-500">*</span></label>
            <select value={family} onChange={(e) => setFamily(e.target.value)} className={INPUT} required>
              {familias.map((f) => (
                <option key={f.codigo} value={f.nombre}>{f.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Material</label>
            <input type="text" value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="A36, A572 Gr.50, A992..." className={INPUT} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Sección</label>
            <input type="text" value={section} onChange={(e) => setSection(e.target.value)} placeholder="IPR, IPS, HSS, OR, PTR..." className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Descripción</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={INPUT} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Dimensiones nominales (opcionales, según familia)
          </p>
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className={LABEL}>Longitud (m)</label>
              <input type="number" step="0.001" value={lengthM} onChange={(e) => setLengthM(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Ancho (mm)</label>
              <input type="number" step="0.01" value={widthMm} onChange={(e) => setWidthMm(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Alto (mm)</label>
              <input type="number" step="0.01" value={heightMm} onChange={(e) => setHeightMm(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Espesor (mm)</label>
              <input type="number" step="0.01" value={thicknessMm} onChange={(e) => setThicknessMm(e.target.value)} className={INPUT} placeholder="Placas" />
            </div>
            <div>
              <label className={LABEL}>Diámetro (mm)</label>
              <input type="number" step="0.01" value={diameterMm} onChange={(e) => setDiameterMm(e.target.value)} className={INPUT} placeholder="Barras" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={LABEL}>Peso <span className="text-red-500">*</span></label>
              <input type="number" min="0.001" step="0.001" value={weightValue} onChange={(e) => setWeightValue(e.target.value)} className={INPUT} required />
            </div>
            <div>
              <label className={LABEL}>Unidad</label>
              <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} className={INPUT}>
                {WEIGHT_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={LABEL}>Precio estimado <span className="text-red-500">*</span></label>
              <input type="number" min="0" step="0.01" value={estimatedPrice} onChange={(e) => setEstimatedPrice(e.target.value)} className={INPUT} required />
            </div>
            <div>
              <label className={LABEL}>Unidad</label>
              <select value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)} className={INPUT}>
                {PRICE_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          ⚠️ Cambiar el peso o precio NO afecta a los proyectos ya capturados. Solo aplica a elementos nuevos.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Área a pintar (m²)</label>
            <input type="number" min="0" step="0.0001" value={paintAreaM2} onChange={(e) => setPaintAreaM2(e.target.value)} className={INPUT} />
          </div>
          <label className="mt-6 flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded border-zinc-300" />
            <span className="text-sm text-zinc-700">Activo</span>
          </label>
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
          onClick={onCancelar}
          disabled={cargando}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={cargando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-dark disabled:opacity-50"
        >
          {cargando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
