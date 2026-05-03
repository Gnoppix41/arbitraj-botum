// src/arbitrage/cycles.ts
import { ArbitrageCycle } from '../models/Cycle';

export const CYCLES: ArbitrageCycle[] = [
  {
    name: "USDT->BTC->ETH->USDT",
    steps: [
      { symbol: "BTCUSDT", side: "BUY", fromAsset: "USDT", toAsset: "BTC" },
      { symbol: "ETHBTC", side: "BUY", fromAsset: "BTC", toAsset: "ETH" },
      { symbol: "ETHUSDT", side: "SELL", fromAsset: "ETH", toAsset: "USDT" }
    ]
  },
  {
    name: "USDT->ETH->BTC->USDT",
    steps: [
      { symbol: "ETHUSDT", side: "BUY", fromAsset: "USDT", toAsset: "ETH" },
      { symbol: "ETHBTC", side: "SELL", fromAsset: "ETH", toAsset: "BTC" }, // ETHBTC çiftinde SELL = ETH sat BTC al
      { symbol: "BTCUSDT", side: "SELL", fromAsset: "BTC", toAsset: "USDT" }
    ]
  }
];