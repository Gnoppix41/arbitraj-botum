import ccxt from 'ccxt';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export class BinanceRestClient {
  private exchange: any; // ccxt tipi sorununu geçici çözmek için any kullanıyoruz

  constructor() {
    this.exchange = new ccxt.binance({
      apiKey: config.binance.apiKey,
      secret: config.binance.apiSecret,
      options: { defaultType: 'spot' }
    });
    if (config.binance.tradeMode === 'TESTNET') {
      this.exchange.setSandboxMode(true);
    }
  }

  async getOrderBook(symbol: string, limit: number = 100) {
    try {
      const orderBook = await this.exchange.fetchOrderBook(symbol.toUpperCase(), limit);
      return {
        bids: orderBook.bids.map(([price, amount]: [number, number]) => [price.toString(), amount.toString()]),
        asks: orderBook.asks.map(([price, amount]: [number, number]) => [price.toString(), amount.toString()])
      };
    } catch (err) {
      logger.error('Order book hatası', { error: (err as Error).message });
      throw err;
    }
  }

  async placeMarketOrder(symbol: string, side: 'buy' | 'sell', quantity: number) {
    try {
      const result = await this.exchange.createMarketOrder(symbol.toUpperCase(), side, quantity);
      return result;
    } catch (err) {
      logger.error('Emir gönderme hatası', { error: (err as Error).message });
      throw err;
    }
  }

  async getUSDTBalance(): Promise<number> {
    try {
      const balance = await this.exchange.fetchBalance();
      const usdt = balance['USDT']?.free || 0;
      return usdt;
    } catch (err) {
      logger.error('Bakiye çekme hatası', { error: (err as Error).message });
      return 0;
    }
  }
}