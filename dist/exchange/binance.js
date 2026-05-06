"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinanceExchange = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class BinanceExchange {
    constructor(apiKey = '', apiSecret = '', testMode = true) {
        this.baseUrl = 'https://api.binance.com';
        this.connected = false;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.testMode = testMode;
    }
    async connect() {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/api/v3/ping`);
            if (response.status === 200) {
                this.connected = true;
                logger_1.logger.info(`✅ Binance bağlantısı kuruldu (${this.testMode ? 'TEST MODU' : 'LIVE MODU'})`);
            }
        }
        catch (error) {
            logger_1.logger.error('Binance bağlantı hatası:', error);
            throw error;
        }
    }
    async getPrices(symbols) {
        const prices = new Map();
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/api/v3/ticker/price`);
            const allPrices = response.data;
            for (const symbol of symbols) {
                const priceData = allPrices.find((p) => p.symbol === symbol);
                if (priceData) {
                    prices.set(symbol, {
                        symbol: symbol,
                        price: parseFloat(priceData.price),
                        timestamp: Date.now()
                    });
                }
            }
            logger_1.logger.debug(`Fiyatlar güncellendi: ${prices.size} coin`);
            return prices;
        }
        catch (error) {
            logger_1.logger.error('Fiyat çekme hatası:', error);
            return prices;
        }
    }
    async getPrice(symbol) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/api/v3/ticker/price?symbol=${symbol}`);
            return parseFloat(response.data.price);
        }
        catch (error) {
            logger_1.logger.error(`${symbol} fiyat çekme hatası:`, error);
            return null;
        }
    }
    async marketBuy(symbol, quantity) {
        if (this.testMode || !this.apiKey) {
            logger_1.logger.info(`🧪 [TEST MODU] ALIM: ${quantity} ${symbol} @ piyasa fiyatı`);
            return {
                symbol,
                orderId: Date.now(),
                price: 0,
                quantity,
                status: 'FILLED'
            };
        }
        // Gerçek işlem için Binance API entegrasyonu
        logger_1.logger.warn('⚠️ Gerçek işlem için API entegrasyonu henüz tamamlanmadı');
        return null;
    }
    async marketSell(symbol, quantity) {
        if (this.testMode || !this.apiKey) {
            logger_1.logger.info(`🧪 [TEST MODU] SATIŞ: ${quantity} ${symbol} @ piyasa fiyatı`);
            return {
                symbol,
                orderId: Date.now(),
                price: 0,
                quantity,
                status: 'FILLED'
            };
        }
        logger_1.logger.warn('⚠️ Gerçek işlem için API entegrasyonu henüz tamamlanmadı');
        return null;
    }
    async getAccountBalance(asset = 'USDT') {
        if (this.testMode || !this.apiKey) {
            return 1000; // Test modunda 1000 USDT var say
        }
        logger_1.logger.warn('⚠️ Gerçek bakiye için API entegrasyonu gerekiyor');
        return 0;
    }
    getConnectionStatus() {
        return this.connected;
    }
    isTestMode() {
        return this.testMode;
    }
}
exports.BinanceExchange = BinanceExchange;
