export interface OrderBook {
  bids: [number, number][];
  asks: [number, number][];
}

export interface ExchangeConfig {
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
}

export interface IExchange {
  getName(): string;
  connect(): Promise<void>;
  disconnect(): void;
  subscribeOrderBook(symbol: string): void;
  getOrderBook(symbol: string): OrderBook | null;
  placeMarketOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number): Promise<any>;
  getBalance(asset: string): Promise<number>;
  getFeeRate(): number;
}