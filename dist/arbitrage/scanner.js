"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArbitrageScanner = void 0;
const logger_1 = require("../utils/logger");
class ArbitrageScanner {
    constructor() {
        this.opportunities = [];
        this.minProfitThreshold = 0.3; // Minimum %0.3 kar
    }
    async scanOpportunities(prices) {
        const opportunities = [];
        // Şimdilik tek borsa kullandığımız için örnek veri üretiyoruz
        // Gerçek uygulamada birden fazla borsa arasında fiyat farkı aranır
        for (const [symbol, price] of prices) {
            // Örnek arbitraj fırsatı (test amaçlı)
            const fakeOtherExchangePrice = price.price * (1 + (Math.random() * 0.01 - 0.005));
            const difference = Math.abs(fakeOtherExchangePrice - price.price);
            const percentage = (difference / price.price) * 100;
            if (percentage > this.minProfitThreshold && fakeOtherExchangePrice > price.price) {
                opportunities.push({
                    symbol: symbol,
                    buyExchange: 'Exchange A',
                    sellExchange: 'Exchange B',
                    buyPrice: price.price,
                    sellPrice: fakeOtherExchangePrice,
                    profitPercentage: percentage,
                    timestamp: Date.now()
                });
            }
        }
        if (opportunities.length > 0) {
            logger_1.logger.info(`${opportunities.length} yeni arbitraj fırsatı tarandı`);
        }
        return opportunities;
    }
    setMinProfitThreshold(threshold) {
        this.minProfitThreshold = threshold;
        logger_1.logger.info(`Minimum kar eşiği %${threshold} olarak güncellendi`);
    }
}
exports.ArbitrageScanner = ArbitrageScanner;
