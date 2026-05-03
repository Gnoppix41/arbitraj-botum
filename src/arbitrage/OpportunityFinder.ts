import { BinanceOrderBook } from '../exchanges/binance/BinanceOrderBook';
import { ArbitrageCycle } from '../models/Cycle';
import { config } from '../config';

export class OpportunityFinder {
  private feeRate = 0.001;

  constructor(
    private orderBooks: Map<string, BinanceOrderBook>,
    private cycleGraph?: Map<string, Set<number>>
  ) {}

  evaluateCycleSimple(cycle: ArbitrageCycle, tradeAmountUSDT: number): { profitRatio: number; stepsDetails: any[] } | null {
    let amount = tradeAmountUSDT;
    const stepsDetails = [];
    for (const step of cycle.steps) {
      const orderBook = this.orderBooks.get(step.symbol.toLowerCase());
      if (!orderBook) return null;
      let price: number | null = null;
      if (step.side === 'BUY') {
        price = orderBook.getBestAsk();
        if (!price) return null;
        const quantity = amount / price;
        const afterFeeQty = quantity * (1 - this.feeRate);
        amount = afterFeeQty;
        stepsDetails.push({ step, price, quantity, afterFeeQty });
      } else {
        price = orderBook.getBestBid();
        if (!price) return null;
        const received = amount * price;
        const afterFeeRevenue = received * (1 - this.feeRate);
        amount = afterFeeRevenue;
        stepsDetails.push({ step, price, received, afterFeeRevenue });
      }
    }
    const profitRatio = (amount - tradeAmountUSDT) / tradeAmountUSDT;
    return { profitRatio, stepsDetails };
  }

  scanAffectedCyclesSimple(
    cycles: ArbitrageCycle[],
    changedSymbols: Set<string>,
    minProfitRatio: number = 0.001,
    tradeAmountUSDT: number = 10
  ): Array<{ cycle: ArbitrageCycle; profitRatio: number; stepsDetails: any[] }> {
    if (!this.cycleGraph) return [];
    const affectedCycleIndices = new Set<number>();
    for (const sym of changedSymbols) {
      const indices = this.cycleGraph.get(sym);
      if (indices) indices.forEach(i => affectedCycleIndices.add(i));
    }
    const opportunities = [];
    for (const idx of affectedCycleIndices) {
      const result = this.evaluateCycleSimple(cycles[idx], tradeAmountUSDT);
      if (result && result.profitRatio > minProfitRatio) {
        opportunities.push({ cycle: cycles[idx], profitRatio: result.profitRatio, stepsDetails: result.stepsDetails });
      }
    }
    return opportunities;
  }
}