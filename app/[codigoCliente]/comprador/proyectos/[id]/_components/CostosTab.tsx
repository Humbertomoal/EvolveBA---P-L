"use client";

import { useMemo } from "react";
import type { CostoDTO } from "@/src/lib/costosTypes";
import { formatImporte } from "@/src/lib/monedas";
import Badge from "@/src/components/Badge";
import EmptyState from "@/src/components/EmptyState";

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type GrupoCuenta = {
  accountId: string;
  accountCode: string;
  accountName: string;
  costos: CostoDTO[];
  subtotal: number;
};

export default function CostosTab({
  costos,
  moAplicada,
  cuentaNominaOperativa,
}: {
  costos: CostoDTO[];
  moAplicada: number;
  cuentaNominaOperativa: { code: string; name: string } | null;
}) {
  const grupos = useMemo(() => {
    const mapa = new Map<string, GrupoCuenta>();
    for (const c of costos) {
      const existente = mapa.get(c.accountId);
      if (existente) {
        existente.costos.push(c);
        existente.subtotal += c.amount;
      } else {
        mapa.set(c.accountId, {
          accountId: c.accountId,
          accountCode: c.accountCode,
          accountName: c.accountName,
          costos: [c],
          subtotal: c.amount,
        });
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }, [costos]);

  const totalCapturado = costos.reduce((acc, c) => acc + c.amount, 0);
  const totalConMo = totalCapturado + moAplicada;

  if (costos.length === 0 && moAplicada === 0) {
    return (
      <EmptyState
        icon="IconReceipt2"
        title="Sin costos capturados"
        description="Los costos de este proyecto se capturan desde el módulo Costos, eligiendo este proyecto."
      />
    );
  }

  return (
    <div className="space-y-4">
      {grupos.map((g) => (
        <div key={g.accountId} className="rounded-card border border-border bg-white shadow-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
            <span className="text-sm font-medium text-zinc-700">
              <span className="font-mono text-xs text-zinc-400">{g.accountCode}</span> {g.accountName}
            </span>
            <span className="text-sm font-semibold text-zinc-800">{formatImporte(g.subtotal, "MXN")}</span>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-zinc-100">
              {g.costos.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                  <td className="px-4 py-2 text-zinc-600">{formatFecha(c.date)}</td>
                  <td className="px-4 py-2 text-zinc-600">{c.supplierName ?? "—"}</td>
                  <td className="px-4 py-2 text-zinc-600">{c.description}</td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-400">{c.elementCode ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge variant={c.paidAt ? "success" : "warning"}>{c.paidAt ? "Pagado" : "Comprometido"}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-800">{formatImporte(c.amount, "MXN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {cuentaNominaOperativa && (
        <div className="rounded-card border border-amber-200 bg-amber-50/50 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <span className="font-mono text-xs text-zinc-400">{cuentaNominaOperativa.code}</span>{" "}
              <span className="text-sm font-medium text-zinc-700">{cuentaNominaOperativa.name}</span>
              <Badge variant="warning" className="ml-2">Calculada desde horas-hombre</Badge>
            </div>
            <span className="text-sm font-semibold text-zinc-800">{formatImporte(moAplicada, "MXN")}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-card border border-border bg-white px-4 py-3 shadow-card">
        <span className="text-sm font-semibold text-zinc-700">Total (costos directos + MO aplicada)</span>
        <span className="text-base font-bold text-primary">{formatImporte(totalConMo, "MXN")}</span>
      </div>
    </div>
  );
}
