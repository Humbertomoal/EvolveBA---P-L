/**
 * Avance % de un proyecto — aislado para enchufar el cálculo real cuando
 * exista captura de Elementos (regla #8 en CLAUDE.md):
 *
 *   Avance = Σ(weight × qty × progressPct) / Σ(weight × qty)
 *
 * Por ahora no hay Elementos capturados en ningún proyecto, así que siempre
 * devuelve 0.
 */
export function calcularAvancePct(_projectId: string): number {
  return 0;
}
