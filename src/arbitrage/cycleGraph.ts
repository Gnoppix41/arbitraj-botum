import { ArbitrageCycle } from '../models/Cycle';

/**
 * Her sembolün hangi cycle indekslerinde geçtiğini tutan bir harita oluşturur.
 * @param cycles tüm döngüler
 * @returns Map(symbol -> Set(cycleIndex))
 */
export function buildCycleGraph(cycles: ArbitrageCycle[]): Map<string, Set<number>> {
  const graph = new Map<string, Set<number>>();
  for (let idx = 0; idx < cycles.length; idx++) {
    const cycle = cycles[idx];
    for (const step of cycle.steps) {
      const symbol = step.symbol.toLowerCase();
      if (!graph.has(symbol)) graph.set(symbol, new Set());
      graph.get(symbol)!.add(idx);
    }
  }
  console.log(`🔗 Cycle graph oluşturuldu: ${graph.size} sembol, ${cycles.length} döngü`);
  return graph;
}

/**
 * Değişen semboller listesine göre etkilenen cycle indekslerini döndürür.
 */
export function getAffectedCycles(changedSymbols: Set<string>, cycleGraph: Map<string, Set<number>>): Set<number> {
  const affected = new Set<number>();
  for (const sym of changedSymbols) {
    const indices = cycleGraph.get(sym);
    if (indices) indices.forEach(i => affected.add(i));
  }
  return affected;
}