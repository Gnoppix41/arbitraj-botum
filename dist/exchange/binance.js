"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinanceExchange = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class BinanceExchange {
    constructor() {
        this.baseUrl = 'https://api.binance.com';
        this.wsUrl = 'wss://stream.binance.com:9443/ws';
        this.connected = false;
    }
    async connect() {
        try {
            // Test bağlantısı
            const response = await axios_1.default.get(`${this.baseUrl}/api/v3/ping`);
            if (response.status === 200) {
                this.connected = true;
                logger_1.logger.info('Binance REST API bağlantısı başarılı');
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
            // Ticker fiyatlarını al
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
    getConnectionStatus() {
        return this.connected;
    }
}
exports.BinanceExchange = BinanceExchange;
