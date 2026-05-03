import { IExchange, OrderBook, ExchangeConfig } from '../IExchange';
import { BinanceWebSocketClient } from './BinanceWebSocketClient';
import { BinanceRestClient } from './BinanceRestClient';
import { BinanceTradeWS } from './BinanceTradeWS';
import { BinanceOrderBook } from './BinanceOrderBook';

export class BinanceExchange implements IExchange {
  private wsClient: BinanceWebSocketClient;
  private restClient: BinanceRestClient;
  private tradeWS: BinanceTradeWS;
  private orderBooks: Map<string, BinanceOrderBook> = new Map();
  private apiKey: string;
  private apiSecret: string;
  private feeRate = 0.001;

  constructor(config: ExchangeConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.wsClient = new BinanceWebSocketClient();
    this.restClient = new BinanceRestClient();
    this.tradeWS = new BinanceTradeWS(this.apiKey, this.apiSecret);
  }

  getName(): string {
    return 'binance';
  }

  async connect(): Promise<void> {
    await this.tradeWS.connect();
    // WebSocket stream bağlantısı ayrıca yapılacak (subscribeOrderBook ile)
  }

  disconnect(): void {
    this.wsClient.disconnect();
    this.tradeWS.disconnect();
  }

  subscribeOrderBook(symbol: string): void {
    const stream = `${symbol.toLowerCase()}@depth20@100ms`;
    this.wsClient.connect([stream]);
    this.wsClient.on('depth', (data) => {
      let orderBook = this.orderBooks.get(data.symbol);
      if (!orderBook) {
        orderBook = new BinanceOrderBook(data.symbol);
        this.orderBooks.set(data.symbol, orderBook);
      }
      orderBook.applyDelta({ bids: data.bids, asks: data.asks });
    });
  }

  getOrderBook(symbol: string): OrderBook | null {
    const ob = this.orderBooks.get(symbol.toLowerCase());
    if (!ob) return null;
    return {
      bids: ob.getBids(20).map(([p, q]) => [p, q]),
      asks: ob.getAsks(20).map(([p, q]) => [p, q])
    };
  }

  async placeMarketOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number): Promise<any> {
    return await this.tradeWS.placeMarketOrder(symbol, side, quantity);
  }

  async getBalance(asset: string): Promise<number> {
    // Implement using restClient.getUSDTBalance etc.
    return 0;
  }

  getFeeRate(): number {
    return this.feeRate;
  }
}