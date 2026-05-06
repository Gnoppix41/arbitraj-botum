import axios from 'axios';
import { logger } from '../utils/logger';

export interface Price {
    symbol: string;
    price: number;
    timestamp: number;
}

export interface OrderResult {
    symbol: string;
    orderId: number;
    price: number;
    quantity: number;
    status: string;
}

export class BinanceExchange {
    private baseUrl = 'https://api.binance.com';
    private connected = false;
    private apiKey: string;
    private apiSecret: string;
    private testMode: boolean;

    constructor(apiKey: string = '', apiSecret: string = '', testMode: boolean = true) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.testMode = testMode;
    }

    async connect(): Promise<void> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v3/ping`);
            if (response.status === 200) {
                this.connected = true;
                logger.info(`✅ Binance bağlantısı kuruldu (${this.testMode ? 'TEST MODU' : 'LIVE MODU'})`);
            }
        } catch (error) {
            logger.error('Binance bağlantı hatası:', error);
            throw error;
        }
    }

    async getPrices(symbols: string[]): Promise<Map<string, Price>> {
        const prices = new Map<string, Price>();
        try {
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

    async getPrice(symbol: string): Promise<number | null> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v3/ticker/price?symbol=${symbol}`);
            return parseFloat(response.data.price);
        } catch (error) {
            logger.error(`${symbol} fiyat çekme hatası:`, error);
            return null;
        }
    }

    async marketBuy(symbol: string, quantity: number): Promise<OrderResult | null> {
        if (this.testMode || !this.apiKey) {
            logger.info(`🧪 [TEST MODU] ALIM: ${quantity} ${symbol} @ piyasa fiyatı`);
            return {
                symbol,
                orderId: Date.now(),
                price: 0,
                quantity,
                status: 'FILLED'
            };
        }
        
        // Gerçek işlem için Binance API entegrasyonu
        logger.warn('⚠️ Gerçek işlem için API entegrasyonu henüz tamamlanmadı');
        return null;
    }

    async marketSell(symbol: string, quantity: number): Promise<OrderResult | null> {
        if (this.testMode || !this.apiKey) {
            logger.info(`🧪 [TEST MODU] SATIŞ: ${quantity} ${symbol} @ piyasa fiyatı`);
            return {
                symbol,
                orderId: Date.now(),
                price: 0,
                quantity,
                status: 'FILLED'
            };
        }
        
        logger.warn('⚠️ Gerçek işlem için API entegrasyonu henüz tamamlanmadı');
        return null;
    }

    async getAccountBalance(asset: string = 'USDT'): Promise<number> {
        if (this.testMode || !this.apiKey) {
            return 1000; // Test modunda 1000 USDT var say
        }
        logger.warn('⚠️ Gerçek bakiye için API entegrasyonu gerekiyor');
        return 0;
    }

    getConnectionStatus(): boolean {
        return this.connected;
    }

    isTestMode(): boolean {
        return this.testMode;
    }
}