import { IExchange, ExchangeConfig } from './IExchange';
import { BinanceExchange } from './binance/BinanceExchange';
import { KrakenExchange } from './kraken/KrakenExchange';

export class ExchangeFactory {
  static create(exchange: 'binance' | 'kraken', config: ExchangeConfig): IExchange {
    switch (exchange) {
      case 'binance':
        return new BinanceExchange(config);
      case 'kraken':
        return new KrakenExchange(config);
      default:
        throw new Error(`Unknown exchange: ${exchange}`);
    }
  }
}