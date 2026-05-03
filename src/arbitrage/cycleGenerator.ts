import { ArbitrageCycle, TradeStep } from '../models/Cycle';

export function generateCycles(
  symbols: string[],
  pairMap: Map<string, { base: string; quote: string }>
): ArbitrageCycle[] {
  const cycles: ArbitrageCycle[] = [];
  const assets = symbols.map(sym => sym.replace('usdt', '').toUpperCase());

  for (let i = 0; i < assets.length; i++) {
    for (let j = 0; j < assets.length; j++) {
      if (i === j) continue;
      const assetA = assets[i];
      const assetB = assets[j];

      const step1Symbol = `${assetA}USDT`.toLowerCase();
      if (!pairMap.has(step1Symbol)) continue;

      // assetA -> assetB
      let step2Symbol = '';
      let step2Side: 'BUY' | 'SELL' = 'BUY';
      if (pairMap.has(`${assetB}${assetA}`.toLowerCase())) {
        step2Symbol = `${assetB}${assetA}`.toLowerCase();
        step2Side = 'BUY';
      } else if (pairMap.has(`${assetA}${assetB}`.toLowerCase())) {
        step2Symbol = `${assetA}${assetB}`.toLowerCase();
        step2Side = 'SELL';
      } else {
        continue;
      }

      const step3Symbol = `${assetB}USDT`.toLowerCase();
      if (!pairMap.has(step3Symbol)) continue;

      cycles.push({
        name: `USDT->${assetA}->${assetB}->USDT`,
        steps: [
          { symbol: step1Symbol, side: 'BUY', fromAsset: 'USDT', toAsset: assetA },
          { symbol: step2Symbol, side: step2Side, fromAsset: assetA, toAsset: assetB },
          { symbol: step3Symbol, side: 'SELL', fromAsset: assetB, toAsset: 'USDT' }
        ]
      });

      // Ters döngü
      const revStep1 = `${assetB}USDT`.toLowerCase();
      let revStep2Symbol = '';
      let revStep2Side: 'BUY' | 'SELL' = 'BUY';
      if (pairMap.has(`${assetA}${assetB}`.toLowerCase())) {
        revStep2Symbol = `${assetA}${assetB}`.toLowerCase();
        revStep2Side = 'BUY';
      } else if (pairMap.has(`${assetB}${assetA}`.toLowerCase())) {
        revStep2Symbol = `${assetB}${assetA}`.toLowerCase();
        revStep2Side = 'SELL';
      } else {
        continue;
      }
      const revStep3 = `${assetA}USDT`.toLowerCase();
      if (!pairMap.has(revStep1) || !pairMap.has(revStep3)) continue;

      cycles.push({
        name: `USDT->${assetB}->${assetA}->USDT`,
        steps: [
          { symbol: revStep1, side: 'BUY', fromAsset: 'USDT', toAsset: assetB },
          { symbol: revStep2Symbol, side: revStep2Side, fromAsset: assetB, toAsset: assetA },
          { symbol: revStep3, side: 'SELL', fromAsset: assetA, toAsset: 'USDT' }
        ]
      });
    }
  }
  console.log(`🔁 ${cycles.length} adet üçgen döngü oluşturuldu.`);
  return cycles;
}