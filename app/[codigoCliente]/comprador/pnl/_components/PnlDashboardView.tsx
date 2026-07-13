"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProyectoComparativoDTO } from "@/src/lib/pnlTypes";
import { PERIODO_TIPOS, semaforoMargen, type PeriodoTipo, type PnlEmpresaDTO } from "@/src/lib/pnlTypes";
import { obtenerPnlEmpresaAction } from "@/src/lib/pnlActions";
import { formatImporte } from "@/src/lib/monedas";
import { usePageTitle } from "@/app/_components/PageHeaderContext";
import Badge, { type BadgeVariant } from "@/src/components/Badge";
import EmptyState from "@/src/components/EmptyState";

const SEMAFORO_VARIANT: Record<"rojo" | "amarillo" | "verde", BadgeVariant> = {
  rojo: "danger",
  amarillo: "warning",
  verde: "success",
};

type Columna = keyof Pick<ProyectoComparativoDTO, "contractAmount" | "facturado" | "costoReal" | "margen" | "margenPct" | "avancePct" | "desviacion">;

export default function PnlDashboardView({
  comparativo,
  empresaInicial,
  puedeVerEmpresa,
  clienteId,
  basePath,
}: {
  comparativo: ProyectoComparativoDTO[];
  empresaInicial: PnlEmpresaDTO | null;
  puedeVerEmpresa: boolean;
  clienteId: string;
  basePath: string;
}) {
  const router = useRouter();
  usePageTitle("P&L");

  const [vista, setVista] = useState<"comparativo" | "empresa">("comparativo");
  const [orden, setOrden] = useState<{ col: Columna; asc: boolean } | null>(null);

  const comparativoOrdenado = useMemo(() => {
    if (!orden) return comparativo;
    return [...comparativo].sort((a, b) => (a[orden.col] - b[orden.col]) * (orden.asc ? 1 : -1));
  }, [comparativo, orden]);

  function ordenarPor(col: Columna) {
    setOrden((prev) => (prev?.col === col ? { col, asc: !prev.asc } : { col, asc: false }));
  }

  const dataBar = comparativo.map((p) => ({
    name: p.projectCode,
    Ingreso: p.facturado,
    "Costo real": p.costoReal,
    Presupuesto: p.presupuestoTotal,
  }));

  return (
    <div className="space-y-4">
      {puedeVerEmpresa && (
        <div className="flex gap-2 border-b border-zinc-200">
          <button
            type="button"
            onClick={() => setVista("comparativo")}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
              vista === "comparativo" ? "border-[var(--color-primario)] text-[var(--color-primario)]" : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Comparativo de proyectos
          </button>
          <button
            type="button"
            onClick={() => setVista("empresa")}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
              vista === "empresa" ? "border-[var(--color-primario)] text-[var(--color-primario)]" : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            P&L de empresa
          </button>
        </div>
      )}

      {vista === "comparativo" && (
        <div className="space-y-4">
          {comparativo.length === 0 ? (
            <EmptyState icon="IconChartBar" title="Sin proyectos" description="No hay proyectos con datos para comparar." />
          ) : (
            <>
              {dataBar.length > 0 && (
                <div className="rounded-card border border-border bg-white p-5 shadow-card">
                  <h3 className="mb-2 text-sm font-semibold text-zinc-900">Ingreso vs. Costo real vs. Presupuesto, por proyecto</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dataBar}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                        <Tooltip formatter={(v) => formatImporte(Number(v), "MXN")} />
                        <Legend />
                        <Bar dataKey="Ingreso" fill="#004439" />
                        <Bar dataKey="Costo real" fill="#dc2626" />
                        <Bar dataKey="Presupuesto" fill="#0891b2" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium text-zinc-500">
                        <th className="px-3 py-2.5">Proyecto</th>
                        <EncabezadoOrdenable col="contractAmount" label="Contrato" orden={orden} onClick={ordenarPor} />
                        <EncabezadoOrdenable col="facturado" label="Facturado" orden={orden} onClick={ordenarPor} />
                        <EncabezadoOrdenable col="costoReal" label="Costo real" orden={orden} onClick={ordenarPor} />
                        <EncabezadoOrdenable col="margen" label="Margen" orden={orden} onClick={ordenarPor} />
                        <EncabezadoOrdenable col="margenPct" label="Margen %" orden={orden} onClick={ordenarPor} />
                        <EncabezadoOrdenable col="avancePct" label="Avance" orden={orden} onClick={ordenarPor} />
                        <EncabezadoOrdenable col="desviacion" label="Desv." orden={orden} onClick={ordenarPor} />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {comparativoOrdenado.map((p) => {
                        const sem = semaforoMargen(p.margenPct);
                        return (
                          <tr
                            key={p.projectId}
                            onClick={() => router.push(`${basePath}/comprador/proyectos/${p.projectId}?tab=pnl`)}
                            className="cursor-pointer hover:bg-zinc-50/50 transition-colors duration-150"
                          >
                            <td className="px-3 py-2.5 text-zinc-700">
                              <span className="font-mono text-xs text-zinc-400">{p.projectCode}</span> {p.projectName}
                            </td>
                            <td className="px-3 py-2.5 text-zinc-600">{formatImporte(p.contractAmount, "MXN")}</td>
                            <td className="px-3 py-2.5 text-zinc-600">{formatImporte(p.facturado, "MXN")}</td>
                            <td className="px-3 py-2.5 text-zinc-600">{formatImporte(p.costoReal, "MXN")}</td>
                            <td className="px-3 py-2.5 font-medium text-zinc-800">{formatImporte(p.margen, "MXN")}</td>
                            <td className="px-3 py-2.5">
                              <Badge variant={SEMAFORO_VARIANT[sem]}>{p.margenPct}%</Badge>
                            </td>
                            <td className="px-3 py-2.5 text-zinc-600">{p.avancePct}%</td>
                            <td className={`px-3 py-2.5 font-medium ${p.desviacion > 0 ? "text-red-600" : "text-green-600"}`}>
                              {p.desviacion >= 0 ? "+" : ""}
                              {formatImporte(p.desviacion, "MXN")} {p.desviacion > 0 ? "🔴" : "🟢"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {vista === "empresa" && puedeVerEmpresa && (
        <PnlEmpresaSeccion clienteId={clienteId} inicial={empresaInicial} />
      )}
    </div>
  );
}

function EncabezadoOrdenable({
  col,
  label,
  orden,
  onClick,
}: {
  col: Columna;
  label: string;
  orden: { col: Columna; asc: boolean } | null;
  onClick: (col: Columna) => void;
}) {
  const activa = orden?.col === col;
  return (
    <th className="px-3 py-2.5">
      <button type="button" onClick={() => onClick(col)} className="flex items-center gap-1 hover:text-zinc-800">
        {label}
        {activa && <span className="text-[10px]">{orden.asc ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}

function PnlEmpresaSeccion({ clienteId, inicial }: { clienteId: string; inicial: PnlEmpresaDTO | null }) {
  const hoy = new Date();
  const [tipo, setTipo] = useState<PeriodoTipo>("MES");
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [desdeCustom, setDesdeCustom] = useState("");
  const [hastaCustom, setHastaCustom] = useState("");
  const [data, setData] = useState<PnlEmpresaDTO | null>(inicial);
  const [cargando, setCargando] = useState(false);

  async function actualizar(nuevoTipo = tipo, nuevoAnio = anio, nuevoMes = mes, desde = desdeCustom, hasta = hastaCustom) {
    setCargando(true);
    const result = await obtenerPnlEmpresaAction(clienteId, nuevoTipo, nuevoAnio, nuevoMes, desde || undefined, hasta || undefined);
    setCargando(false);
    if (result.ok && result.data) setData(result.data);
  }

  const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const INPUT = "rounded-md border border-zinc-300 px-2 py-1.5 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-white p-4 shadow-card">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Periodo</label>
          <select value={tipo} onChange={(e) => { const t = e.target.value as PeriodoTipo; setTipo(t); actualizar(t, anio, mes); }} className={INPUT}>
            {PERIODO_TIPOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        {tipo !== "CUSTOM" ? (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Año</label>
              <input type="number" value={anio} onChange={(e) => { const a = parseInt(e.target.value, 10) || anio; setAnio(a); actualizar(tipo, a, mes); }} className={`${INPUT} w-24`} />
            </div>
            {(tipo === "MES" || tipo === "TRIMESTRE") && (
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">{tipo === "MES" ? "Mes" : "Trimestre (mes de referencia)"}</label>
                <select value={mes} onChange={(e) => { const m = parseInt(e.target.value, 10); setMes(m); actualizar(tipo, anio, m); }} className={INPUT}>
                  {MESES.map((nombre, i) => (
                    <option key={nombre} value={i + 1}>{nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Desde</label>
              <input type="date" value={desdeCustom} onChange={(e) => { setDesdeCustom(e.target.value); actualizar(tipo, anio, mes, e.target.value, hastaCustom); }} className={INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Hasta</label>
              <input type="date" value={hastaCustom} onChange={(e) => { setHastaCustom(e.target.value); actualizar(tipo, anio, mes, desdeCustom, e.target.value); }} className={INPUT} />
            </div>
          </>
        )}
        {cargando && <span className="text-xs text-zinc-400">Calculando…</span>}
      </div>

      {!data ? (
        <EmptyState icon="IconChartBar" title="Sin datos" description="No se pudo calcular el P&L de empresa para este periodo." />
      ) : (
        <>
          <div className="rounded-card border border-border bg-white p-5 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-zinc-900">Estado de resultados — {data.periodoLabel}</h2>

            <Seccion titulo="Ingresos">
              <Fila label="Estimaciones autorizadas" valor={formatImporte(data.ingreso, "MXN")} grande />
            </Seccion>

            <Seccion titulo="(−) Costos operativos (nivel 2)">
              {data.costosOperativos.length === 0 ? (
                <p className="text-sm text-zinc-400">Sin movimientos en el periodo.</p>
              ) : (
                data.costosOperativos.map((c) => (
                  <div key={c.accountId} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-zinc-700">
                      <span className="font-mono text-xs text-zinc-400">{c.accountCode}</span>
                      {c.accountName}
                      {c.accountCode === "2.8" && <span title="Desde TimeEntry, nunca desde Cost">🔒</span>}
                    </span>
                    <span className="text-zinc-800">{formatImporte(c.monto, "MXN")}</span>
                  </div>
                ))
              )}
              <div className="mt-2 border-t border-zinc-100 pt-2">
                <Fila label="Total costos operativos" valor={formatImporte(data.totalCostosOperativos, "MXN")} destacado />
              </div>
            </Seccion>

            <div className="my-3 flex items-center justify-between rounded-md bg-zinc-50 px-4 py-3">
              <span className="font-semibold text-zinc-800">Margen bruto</span>
              <span className="flex items-center gap-2">
                <span className="font-bold text-zinc-800">{formatImporte(data.margenBruto, "MXN")}</span>
                <Badge variant={SEMAFORO_VARIANT[semaforoMargen(data.margenBrutoPct)]}>{data.margenBrutoPct}%</Badge>
              </span>
            </div>

            <div className="space-y-1.5 text-sm">
              <FilaResta label="Gastos administrativos (nivel 3)" valor={data.gastosAdministrativos} />
              <FilaResta label="Publicidad y marketing (nivel 4)" valor={data.publicidadMarketing} />
              <div>
                <FilaResta label="MO ociosa 🔒" valor={data.moOciosa} verdeSiNegativo />
                <p className="pl-2 text-xs text-zinc-400">
                  Nómina real − MO aplicada, desde PayrollPeriod.
                  {data.moOciosa < 0 && " Negativa: el hourlyCost puede estar sobreestimado."}
                </p>
              </div>
              <FilaResta label="Impuestos (nivel 5)" valor={data.impuestos} />
            </div>

            <div className="mt-4 flex items-center justify-between border-t-2 border-zinc-200 pt-3">
              <span className="text-base font-bold text-zinc-900">Utilidad neta</span>
              <span className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">{formatImporte(data.utilidadNeta, "MXN")}</span>
                <span className="text-sm text-zinc-500">{data.utilidadNetaPct}%</span>
              </span>
            </div>
          </div>

          {data.evolucionMensual.length > 1 && (
            <div className="rounded-card border border-border bg-white p-5 shadow-card">
              <h3 className="mb-2 text-sm font-semibold text-zinc-900">Evolución mensual — ingreso vs. costo</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.evolucionMensual}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v) => formatImporte(Number(v), "MXN")} />
                    <Legend />
                    <Line type="monotone" dataKey="ingreso" name="Ingreso" stroke="#004439" strokeWidth={2} />
                    <Line type="monotone" dataKey="costo" name="Costo" stroke="#dc2626" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{titulo}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Fila({ label, valor, destacado, grande }: { label: string; valor: string; destacado?: boolean; grande?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={destacado ? "font-medium text-zinc-800" : "text-zinc-600"}>{label}</span>
      <span className={grande ? "text-lg font-bold text-primary" : destacado ? "font-semibold text-zinc-800" : "text-zinc-700"}>{valor}</span>
    </div>
  );
}

function FilaResta({ label, valor, verdeSiNegativo }: { label: string; valor: number; verdeSiNegativo?: boolean }) {
  const esVerde = verdeSiNegativo && valor < 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-600">{label}</span>
      <span className={esVerde ? "font-medium text-green-600" : "font-medium text-zinc-800"}>
        {formatImporte(valor, "MXN")}
      </span>
    </div>
  );
}
