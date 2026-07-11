// Shared constants and types for the catálogo de cuentas contables (Fase 6).
// No server imports — safe to use in Client Components.

export type CostAccountDTO = {
  id: string;
  code: string;
  name: string;
  level: number;
  parentId: string | null;
  order: number;
  isProject: boolean;
  isSystem: boolean;
  active: boolean;
};

export type CostAccountFormInput = {
  code: string;
  name: string;
  level: number;
  parentId: string | null;
  order: number;
  isProject: boolean;
  active: boolean;
};

export const NIVEL_LABEL: Record<number, string> = {
  2: "Costos operativos",
  3: "Gastos administrativos",
  4: "Publicidad y marketing",
  5: "Impuestos",
};

export type CostAccountNodo = CostAccountDTO & { hijos: CostAccountNodo[] };

export function construirArbolCuentas(cuentas: CostAccountDTO[]): CostAccountNodo[] {
  const nodos = new Map<string, CostAccountNodo>(
    cuentas.map((c) => [c.id, { ...c, hijos: [] }])
  );
  const raiz: CostAccountNodo[] = [];
  for (const nodo of nodos.values()) {
    if (nodo.parentId && nodos.has(nodo.parentId)) {
      nodos.get(nodo.parentId)!.hijos.push(nodo);
    } else {
      raiz.push(nodo);
    }
  }
  const ordenar = (lista: CostAccountNodo[]) => {
    lista.sort((a, b) => a.order - b.order || a.code.localeCompare(b.code));
    lista.forEach((n) => ordenar(n.hijos));
  };
  ordenar(raiz);
  return raiz;
}

// Cuentas HOJA capturables: sin hijos y sin isSystem (regla #11 — el select de
// captura de costos jamás debe ofrecer Nómina Operativa/Administrativa).
export function cuentasCapturables(cuentas: CostAccountDTO[]): CostAccountDTO[] {
  const tienenHijos = new Set(cuentas.filter((c) => c.parentId).map((c) => c.parentId));
  return cuentas
    .filter((c) => c.active && !c.isSystem && !tienenHijos.has(c.id))
    .sort((a, b) => a.code.localeCompare(b.code));
}

// Cuentas seleccionables como línea de una PARTIDA de presupuesto (Fase 7):
// hoja, nivel 2 (isProject — solo cuentas que van a obra tienen sentido dentro
// de un presupuesto de proyecto, regla #13), excluyendo "2.1 Materia prima"
// porque esa línea se crea/actualiza sola desde los elementos (regla #14).
// A diferencia de `cuentasCapturables`, aquí SÍ se incluyen las isSystem: "2.8
// Nómina Operativa" se presupuesta aunque su costo real nunca se capture como
// Cost (viene de TimeEntry).
export function cuentasParaPartida(cuentas: CostAccountDTO[]): CostAccountDTO[] {
  const tienenHijos = new Set(cuentas.filter((c) => c.parentId).map((c) => c.parentId));
  return cuentas
    .filter((c) => c.active && c.level === 2 && c.isProject && c.code !== "2.1" && !tienenHijos.has(c.id))
    .sort((a, b) => a.code.localeCompare(b.code));
}
