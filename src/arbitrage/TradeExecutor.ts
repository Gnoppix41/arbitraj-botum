import { BinanceRestClient } from '../exchanges/binance/BinanceRestClient';
import { BinanceTradeWS } from '../exchanges/binance/BinanceTradeWS';
import { BinanceOrderBook } from '../exchanges/binance/BinanceOrderBook';
import { ArbitrageCycle } from '../models/Cycle';
import { RiskManager } from '../risk/RiskManager';
import { config } from '../config';
import { DatabaseService } from '../database/DatabaseService';
import { logger } from '../utils/logger';

export class TradeExecutor {
  private maxTradeAmountUSDT: number;
  private minProfitRatio: number;

  constructor(
    private restClient: BinanceRestClient,
    private tradeWS: BinanceTradeWS,
    private orderBooks: Map<string, BinanceOrderBook>,
    private apiKey: string,
    private apiSecret: string,
    private riskManager: RiskManager
  ) {
    this.maxTradeAmountUSDT = config.trading.maxTradeAmountUSDT;
    this.minProfitRatio = config.trading.minProfitRatio;
  }

  private async placeOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number): Promise<any> {
    try {
      return await this.tradeWS.placeMarketOrder(symbol, side, quantity);
    } catch (wsError) {
      logger.warn('WebSocket order hatası, REST deneniyor', { error: (wsError as Error).message, symbol });
      return await this.restClient.placeMarketOrder(symbol, side.toLowerCase() as 'buy' | 'sell', quantity);
    }
  }

  async execute(cycle: ArbitrageCycle, initialAmountUSDT: number, stepsDetails?: any[]): Promise<boolean> {
    if (initialAmountUSDT > this.maxTradeAmountUSDT) {
      console.log(`❌ İşlem büyüklüğü limiti aştı: ${initialAmountUSDT} > ${this.maxTradeAmountUSDT}`);
      return false;
    }

    const currentProfit = this.reEvaluateProfit(cycle, initialAmountUSDT);
    if (!currentProfit || currentProfit.profitRatio < this.minProfitRatio) {
      console.log(`⚠️ Kâr eşiğin altında, işlem iptal. Kâr: ${currentProfit?.profitRatio}`);
      return false;
    }

    console.log(`🚀 İşlem başlatılıyor: ${cycle.name}, miktar: ${initialAmountUSDT} USDT, beklenen kâr: ${(currentProfit.profitRatio * 100).toFixed(4)}%`);
    
    let currentAmount = initialAmountUSDT;
    let currentAsset = 'USDT';
    let tradeDetails: any[] = [];

    for (let i = 0; i < cycle.steps.length; i++) {
      const step = cycle.steps[i];
      const orderBook = this.orderBooks.get(step.symbol.toLowerCase());
      if (!orderBook) {
        console.error(`Order book bulunamadı: ${step.symbol}`);
        return false;
      }

      if (step.side === 'BUY') {
        const price = orderBook.getBestAsk();
        if (!price) {
          console.error(`Fiyat bulunamadı: ${step.symbol} ask`);
          return false;
        }
        const quantity = currentAmount / price;
        try {
          const result = await this.placeOrder(step.symbol, 'BUY', quantity);
          const executedQty = parseFloat(result.executedQty);
          currentAmount = executedQty;
          currentAsset = step.toAsset;
          tradeDetails.push({ step: i+1, symbol: step.symbol, side: 'BUY', price, quantity, executedQty, result });
        } catch (err) {
          console.error(`❌ Adım ${i+1} ALIM hatası:`, err);
          return false;
        }
      } else {
        const price = orderBook.getBestBid();
        if (!price) {
          console.error(`Fiyat bulunamadı: ${step.symbol} bid`);
          return false;
        }
        try {
          const result = await this.placeOrder(step.symbol, 'SELL', currentAmount);
          const receivedQuote = parseFloat(result.cummulativeQuoteQty);
          currentAmount = receivedQuote;
          currentAsset = step.toAsset;
          tradeDetails.push({ step: i+1, symbol: step.symbol, side: 'SELL', price, quantity: currentAmount, receivedQuote, result });
        } catch (err) {
          console.error(`❌ Adım ${i+1} SATIŞ hatası:`, err);
          return false;
        }
      }
      await this.sleep(50);
    }

    const profitUSDT = currentAmount - initialAmountUSDT;
    console.log(`🎉 İşlem tamamlandı! ${cycle.name} -> ${currentAmount} ${currentAsset} (Kâr: ${profitUSDT.toFixed(4)} USDT)`);

    try {
      await DatabaseService.saveTrade({
        cycleName: cycle.name,
        success: true,
        profitUSDT: profitUSDT,
        amountUSDT: initialAmountUSDT,
        details: tradeDetails
      });
    } catch (dbError) {
      logger.error('Veritabanına işlem kaydedilemedi', { error: (dbError as Error).message });
    }

    return true;
  }

  private reEvaluateProfit(cycle: ArbitrageCycle, initialAmount: number): { profitRatio: number } | null {
    let amount = initialAmount;
    for (const step of cycle.steps) {
      const orderBook = this.orderBooks.get(step.symbol.toLowerCase());
      if (!orderBook) return null;
      if (step.side === 'BUY') {
        const price = orderBook.getBestAsk();
        if (!price) return null;
        amount = (amount / price) * 0.999;
      } else {
        const price = orderBook.getBestBid();
        if (!price) return null;
        amount = (amount * price) * 0.999;
      }
    }
    return { profitRatio: (amount - initialAmount) / initialAmount };
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}