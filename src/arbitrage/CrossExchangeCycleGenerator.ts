import { IExchange } from '../exchanges/IExchange';
import { ArbitrageCycle } from '../models/Cycle';

export function generateCrossExchangeCycles(
  exchanges: IExchange[],
  symbols: string[]
): ArbitrageCycle[] {
  const cycles: ArbitrageCycle[] = [];
  for (const asset of symbols) {
    for (const exchangeA of exchanges) {
      for (const exchangeB of exchanges) {
        if (exchangeA === exchangeB) continue;
        // USDT -> asset on exchangeA (BUY)
        // asset -> USDT on exchangeB (SELL)
        cycles.push({
          name: `USDT->${asset}(${exchangeA.getName()})->USDT(${exchangeB.getName()})`,
          steps: [
            { symbol: `${asset}USDT`, side: 'BUY', fromAsset: 'USDT', toAsset: asset },
            { symbol: `${asset}USDT`, side: 'SELL', fromAsset: asset, toAsset: 'USDT' }
          ]
        });
      }
    }
  }
  return cycles;
}