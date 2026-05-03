export class BinanceOrderBook {
  private bids = new Map<number, number>();
  private asks = new Map<number, number>();

  constructor(public symbol: string) {}

  public loadSnapshot(snapshot: { bids: [string, string][]; asks: [string, string][] }) {
    this.bids.clear();
    this.asks.clear();
    for (const [priceStr, qtyStr] of snapshot.bids) {
      this.bids.set(parseFloat(priceStr), parseFloat(qtyStr));
    }
    for (const [priceStr, qtyStr] of snapshot.asks) {
      this.asks.set(parseFloat(priceStr), parseFloat(qtyStr));
    }
  }

  public applyDelta(delta: { bids: [string, string][]; asks: [string, string][] }) {
    for (const [priceStr, qtyStr] of delta.bids) {
      const price = parseFloat(priceStr);
      const qty = parseFloat(qtyStr);
      if (qty === 0) this.bids.delete(price);
      else this.bids.set(price, qty);
    }
    for (const [priceStr, qtyStr] of delta.asks) {
      const price = parseFloat(priceStr);
      const qty = parseFloat(qtyStr);
      if (qty === 0) this.asks.delete(price);
      else this.asks.set(price, qty);
    }
  }

  public getBestBid(): number | null {
    if (this.bids.size === 0) return null;
    return Math.max(...this.bids.keys());
  }

  public getBestAsk(): number | null {
    if (this.asks.size === 0) return null;
    return Math.min(...this.asks.keys());
  }

  public getBids(limit: number = 10): [number, number][] {
    return Array.from(this.bids.entries())
      .sort((a, b) => b[0] - a[0])
      .slice(0, limit);
  }

  public getAsks(limit: number = 10): [number, number][] {
    return Array.from(this.asks.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(0, limit);
  }

  /**
   * Alış işlemi için slippage hesaplama (USDT harcanarak)
   * @param quoteAmount harcanacak USDT miktarı
   */
  public getBuyPriceWithSlippage(quoteAmount: number): { avgPrice: number; totalCost: number; executedQty: number } | null {
    let remaining = quoteAmount;
    let totalCost = 0;
    let executedQty = 0;
    const asks = this.getAsks(50);
    for (const [price, qty] of asks) {
      const cost = price * qty;
      if (remaining <= cost) {
        const qtyExecuted = remaining / price;
        totalCost += remaining;
        executedQty += qtyExecuted;
        remaining = 0;
        break;
      } else {
        totalCost += cost;
        executedQty += qty;
        remaining -= cost;
      }
    }
    if (remaining > 0) return null;
    const avgPrice = totalCost / executedQty;
    return { avgPrice, totalCost, executedQty };
  }
// src/exchanges/binance/BinanceOrderBook.ts (eklenecek metod)
/**
 * Mevcut ask (alış) derinliğine göre maksimum işlem miktarını (USDT) hesaplar.
 * @param maxSlippagePercent maksimum kabul edilebilir kayma yüzdesi (örnek: 0.01 = %1)
 * @returns Maksimum USDT miktarı
 */
public getMaxBuyAmountByDepth(maxSlippagePercent: number = 0.01): number {
  const asks = this.getAsks(50);
  if (asks.length === 0) return 0;
  
  let totalCost = 0;
  let weightedPrice = 0;
  let firstPrice = asks[0][0];
  
  for (const [price, qty] of asks) {
    const cost = price * qty;
    totalCost += cost;
    weightedPrice += price * cost;
    // Şu ana kadarki ortalama fiyat
    const avgPrice = weightedPrice / totalCost;
    // İlk fiyata göre kayma oranı
    const slippage = (avgPrice - firstPrice) / firstPrice;
    if (slippage > maxSlippagePercent) {
      // Kayma limitini aştık, bir önceki kademeye kadar olan miktarı döndür
      return totalCost - cost;
    }
  }
  return totalCost; // Tüm derinlik kullanılabilir
}
  /**
   * Satış işlemi için slippage hesaplama (varlık miktarı satılarak)
   * @param baseQty satılacak varlık miktarı (örn. BTC)
   */
  public getSellPriceWithSlippage(baseQty: number): { avgPrice: number; totalRevenue: number; executedQty: number } | null {
    let remaining = baseQty;
    let totalRevenue = 0;
    let executedQty = 0;
    const bids = this.getBids(50);
    for (const [price, qty] of bids) {
      if (remaining <= qty) {
        const revenue = remaining * price;
        totalRevenue += revenue;
        executedQty += remaining;
        remaining = 0;
        break;
      } else {
        totalRevenue += qty * price;
        executedQty += qty;
        remaining -= qty;
      }
    }
    if (remaining > 0) return null;
    const avgPrice = totalRevenue / executedQty;
    return { avgPrice, totalRevenue, executedQty };
  }
}