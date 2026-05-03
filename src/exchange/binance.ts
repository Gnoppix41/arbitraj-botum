import axios from 'axios';
import { logger } from '../utils/logger';

export interface Price {
    symbol: string;
    price: number;
    timestamp: number;
}

export class BinanceExchange {
    private baseUrl = 'https://api.binance.com';
    private wsUrl = 'wss://stream.binance.com:9443/ws';
    private connected = false;

    async connect(): Promise<void> {
        try {
            // Test bağlantısı
            const response = await axios.get(`${this.baseUrl}/api/v3/ping`);
            if (response.status === 200) {
                this.connected = true;
                logger.info('Binance REST API bağlantısı başarılı');
            }
        } catch (error) {
            logger.error('Binance bağlantı hatası:', error);
            throw error;
        }
    }

    async getPrices(symbols: string[]): Promise<Map<string, Price>> {
        const prices = new Map<string, Price>();
        
        try {
            // Ticker fiyatlarını al
            const response = await axios.get(`${this.baseUrl}/api/v3/ticker/price`);
            const allPrices = response.data;
            
            for (const symbol of symbols) {
                const priceData = allPrices.find((p: any) => p.symbol === symbol);
                if (priceData) {
                    prices.set(symbol, {
                        symbol: symbol,
                        price: parseFloat(priceData.price),
                        timestamp: Date.now()
                    });
                }
            }
            
            logger.debug(`Fiyatlar güncellendi: ${prices.size} coin`);
            return prices;
            
        } catch (error) {
            logger.error('Fiyat çekme hatası:', error);
            return prices;
        }
    }

    getConnectionStatus(): boolean {
        return this.connected;
    }
}