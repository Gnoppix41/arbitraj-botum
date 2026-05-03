import axios from 'axios';
import { IExchange, OrderBook, ExchangeConfig } from '../IExchange';

export class KrakenExchange implements IExchange {
  private apiKey: string;
  private apiSecret: string;
  private orderBooks: Map<string, OrderBook> = new Map();
  private feeRate = 0.0026; // Kraken maker/taker ~0.26%

  constructor(config: ExchangeConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  getName(): string {
    return 'kraken';
  }

  async connect(): Promise<void> {
    // Kraken WebSocket desteği için ayrıca implementasyon gerekli
    console.log('Kraken bağlantısı hazır (REST mode)');
  }

  disconnect(): void {}

  subscribeOrderBook(symbol: string): void {
    // Kraken için WebSocket ile order book dinleme (ileride eklenecek)
    // Şimdilik periyodik REST polling yapılabilir
    setInterval(async () => {
      const ob = await this.fetchOrderBookRest(symbol);
      if (ob) this.orderBooks.set(symbol, ob);
    }, 1000);
  }

  private async fetchOrderBookRest(symbol: string): Promise<OrderBook | null> {
    try {
      const response = await axios.get(`https://api.kraken.com/0/public/Depth?pair=${symbol.toUpperCase()}`);
      const data = response.data.result;
      const pair = Object.keys(data)[0];
      const bids = data[pair].bids.slice(0, 20).map((b: any) => [parseFloat(b[0]), parseFloat(b[1])]);
      const asks = data[pair].asks.slice(0, 20).map((a: any) => [parseFloat(a[0]), parseFloat(a[1])]);
      return { bids, asks };
    } catch (err) {
      console.error('Kraken order book hatası:', err);
      return null;
    }
  }

  getOrderBook(symbol: string): OrderBook | null {
    return this.orderBooks.get(symbol) || null;
  }

  async placeMarketOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number): Promise<any> {
    // Kraken REST API ile emir gönderme (implementasyon gerekli)
    console.log(`Kraken ${side} ${quantity} ${symbol}`);
    return {};
  }

  async getBalance(asset: string): Promise<number> {
    return 0;
  }

  getFeeRate(): number {
    return this.feeRate;
  }
}