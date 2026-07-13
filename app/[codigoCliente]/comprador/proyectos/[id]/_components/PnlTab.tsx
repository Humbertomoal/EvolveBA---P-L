"use client";

import { IconLock } from "@tabler/icons-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PnlProyectoDTO } from "@/src/lib/pnlTypes";
import { semaforoDesviacion, semaforoMargen } from "@/src/lib/pnlTypes";
import { formatImporte } from "@/src/lib/monedas";
import Badge, { type BadgeVariant } from "@/src/components/Badge";
import EmptyState from "@/src/components/EmptyState";

const COLORES = ["#004439", "#0f766e", "#0891b2", "#7c3aed", "#c026d3", "#dc2626", "#d97706", "#65a30d"];

const SEMAFORO_VARIANT: Record<"rojo" | "amarillo" | "verde", BadgeVariant> = {
  rojo: "danger",
  amarillo: "warning",
  verde: "success",
};

export default function PnlTab({ pnl }: { pnl: PnlProyectoDTO | null }) {
  if (!pnl) {
    return <EmptyState icon="IconChartBar" title="Sin datos" description="No se pudo calcular el P&L de este proyecto." />;
  }

  const margenSem = semaforoMargen(pnl.margenPct);
  const desvSem = semaforoDesviacion(pnl.desviacion);
  const eacMargenSem = semaforoMargen(pnl.eacMargenPctProyectado);

  const dataPie = pnl.costosPorCuenta
    .filter((c) => c.monto > 0)
    .map((c) => ({ name: `${c.accountCode} ${c.accountName}`, value: c.monto }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">P&L — {pnl.projectName}</h2>
        <Badge variant="info">Avance: {pnl.avancePct}%</Badge>
      </div>

      {/* INGRESO */}
      <Seccion titulo="Ingreso">
        <Fila label="Estimaciones autorizadas" valor={formatImporte(pnl.ingreso, "MXN")} grande />
        <p className="text-xs text-zinc-400">
          Facturado de {formatImporte(pnl.contractAmount, "MXN")} de contrato ({pnl.facturadoPct}%)
        </p>
      </Seccion>

      {/* COSTOS DIRECTOS */}
      <Seccion titulo="Costos directos">
        <div className="space-y-1.5">
          {pnl.costosPorCuenta.length === 0 ? (
            <p className="text-sm text-zinc-400">Sin costos capturados todavía.</p>
          ) : (
            pnl.costosPorCuenta.map((c) => {
              const semLinea = c.presupuesto > 0 ? semaforoDesviacion(c.monto - c.presupuesto) : null;
              return (
                <div key={c.accountId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-zinc-700">
                    <span className="font-mono text-xs text-zinc-400">{c.accountCode}</span>
                    {c.accountName}
                    {c.esCalculada && (
                      <span title="Calculado desde horas-hombre (TimeEntry), nunca desde Cost">
                        <IconLock className="h-3.5 w-3.5 text-amber-500" />
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    {c.presupuesto > 0 && (
                      <span className="text-xs text-zinc-400">
                        de {formatImporte(c.presupuesto, "MXN")} ({c.pctConsumo}%)
                      </span>
                    )}
                    {semLinea && <Badge variant={semLinea === "rojo" ? "danger" : "success"}>{semLinea === "rojo" ? "🔴" : "🟢"}</Badge>}
                    <span className="font-medium text-zinc-800">{formatImporte(c.monto, "MXN")}</span>
                  </span>
                </div>
              );
            })
          )}
        </div>
        <div className="mt-3 border-t border-zinc-100 pt-3">
          <Fila label="Total costo real" valor={formatImporte(pnl.costoReal, "MXN")} destacado />
        </div>
      </Seccion>

      {dataPie.length > 0 && (
        <div className="rounded-card border border-border bg-white p-5 shadow-card">
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">Composición del costo por cuenta</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {dataPie.map((entry, i) => (
                    <Cell key={entry.name} fill={COLORES[i % COLORES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatImporte(Number(v), "MXN")} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* MARGEN BRUTO */}
      <div className="rounded-card border border-border bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-900">Margen bruto</span>
          <Badge variant={SEMAFORO_VARIANT[margenSem]}>{pnl.margenPct}%</Badge>
        </div>
        <p className="mt-1 text-xl font-bold text-zinc-800">{formatImporte(pnl.margenBruto, "MXN")}</p>
      </div>

      {/* CONTROL PRESUPUESTAL */}
      <Seccion titulo="Control presupuestal">
        <Fila label="Presupuesto total" valor={formatImporte(pnl.presupuestoTotal, "MXN")} />
        <Fila label={`Presupuesto devengado (× ${pnl.avancePct}% avance)`} valor={formatImporte(pnl.presupuestoDevengado, "MXN")} />
        <Fila label="Costo real" valor={formatImporte(pnl.costoReal, "MXN")} />
        <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2">
          <span className="font-medium text-zinc-800">Desviación</span>
          <span className={`flex items-center gap-2 font-semibold ${desvSem === "rojo" ? "text-red-600" : "text-green-600"}`}>
            {desvSem === "rojo" ? "⚠️" : "✅"}
            {pnl.desviacion >= 0 ? "+" : ""}
            {formatImporte(pnl.desviacion, "MXN")}
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          {desvSem === "rojo"
            ? `Estás gastando ${pnl.presupuestoDevengado > 0 ? Math.round((pnl.desviacion / pnl.presupuestoDevengado) * 1000) / 10 : 0}% más de lo presupuestado a este avance`
            : "Vas dentro del presupuesto a este avance"}
        </p>
      </Seccion>

      {/* PROYECCIÓN AL CIERRE (EAC) */}
      <div className={`rounded-card border p-5 shadow-card ${eacMargenSem === "rojo" ? "border-red-300 bg-red-50/50" : "border-border bg-white"}`}>
        <h3 className="mb-3 text-sm font-semibold text-zinc-900">Proyección al cierre (EAC)</h3>
        <Fila label="Costo estimado final = Costo real / avance%" valor={formatImporte(pnl.eacCostoFinal, "MXN")} />
        <Fila label="Margen proyectado = Contrato − EAC" valor={formatImporte(pnl.eacMargenProyectado, "MXN")} destacado />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-zinc-600">Margen % proyectado</span>
          <Badge variant={SEMAFORO_VARIANT[eacMargenSem]}>{pnl.eacMargenPctProyectado}%</Badge>
        </div>
        {pnl.eacMargenProyectado < 0 && (
          <p className="mt-3 rounded-md bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">
            ⚠️ El margen proyectado al cierre es NEGATIVO — esta obra va a perder dinero si el ritmo actual de gasto continúa.
          </p>
        )}
      </div>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-white p-5 shadow-card">
      <h3 className="mb-3 text-sm font-semibold text-zinc-900">{titulo}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Fila({ label, valor, destacado, grande }: { label: string; valor: string; destacado?: boolean; grande?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={destacado ? "font-medium text-zinc-800" : "text-zinc-600"}>{label}</span>
      <span className={grande ? "text-lg font-bold text-primary" : destacado ? "font-semibold text-zinc-800" : "text-zinc-700"}>
        {valor}
      </span>
    </div>
  );
}
