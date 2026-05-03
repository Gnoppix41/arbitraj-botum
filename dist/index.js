"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const binance_1 = require("./exchange/binance");
const scanner_1 = require("./arbitrage/scanner");
const logger_1 = require("./utils/logger");
// Environment variables yükle
dotenv_1.default.config();
// Express uygulaması
const app = (0, express_1.default)();
const PORT = process.env.PORT || 10000;
// Bot durumu
let isBotRunning = false;
let botStartTime = null;
// Initialize exchanges
const binance = new binance_1.BinanceExchange();
// Initialize arbitrage scanner
const scanner = new scanner_1.ArbitrageScanner();
/**
 * Ana arbitraj döngüsü
 */
async function startArbitrageBot() {
    logger_1.logger.info('🚀 Arbitraj botu başlatılıyor...');
    botStartTime = new Date();
    isBotRunning = true;
    try {
        // Borsalara bağlan
        await binance.connect();
        logger_1.logger.info('✅ Binance bağlantısı kuruldu');
        // Arbitraj döngüsü (her 5 saniyede bir)
        setInterval(async () => {
            if (!isBotRunning)
                return;
            try {
                // Fiyatları al
                const prices = await binance.getPrices(['BTCUSDT', 'ETHUSDT', 'BNBUSDT']);
                // Arbitraj fırsatlarını tara
                const opportunities = await scanner.scanOpportunities(prices);
                if (opportunities.length > 0) {
                    logger_1.logger.info(`🎯 ${opportunities.length} arbitraj fırsatı bulundu!`);
                    // Fırsatları değerlendir
                    for (const opp of opportunities) {
                        if (opp.profitPercentage > 0.5) { // %0.5'ten yüksek kar
                            logger_1.logger.info(`💰 Fırsat: ${opp.symbol} - %${opp.profitPercentage.toFixed(2)} kar`);
                            await executeArbitrage(opp);
                        }
                    }
                }
                else {
                    logger_1.logger.debug('📊 Aktif arbitraj fırsatı yok');
                }
            }
            catch (error) {
                logger_1.logger.error('Arbitraj döngüsünde hata:', error);
            }
        }, 5000); // 5 saniye
    }
    catch (error) {
        logger_1.logger.error('Bot başlatma hatası:', error);
        isBotRunning = false;
    }
}
/**
 * Arbitraj işlemini gerçekleştir
 */
async function executeArbitrage(opportunity) {
    // Buraya gerçek işlem kodlarını ekleyin
    logger_1.logger.info(`💸 İşlem gerçekleştiriliyor: ${opportunity.symbol}`);
    // Burada API key'lerinizle işlem yapabilirsiniz
}
/**
 * Health check endpoint - Render için kritik!
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        botRunning: isBotRunning,
        uptime: botStartTime ? Math.floor((Date.now() - botStartTime.getTime()) / 1000) : 0,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
/**
 * Bot durumunu gösteren endpoint
 */
app.get('/status', (req, res) => {
    res.json({
        running: isBotRunning,
        startTime: botStartTime,
        currentTime: new Date().toISOString(),
        exchange: 'Binance',
        scanner: 'Active'
    });
});
/**
 * Botu manuel durdur (opsiyonel)
 */
app.post('/stop', (req, res) => {
    if (!isBotRunning) {
        return res.json({ message: 'Bot zaten durdurulmuş' });
    }
    isBotRunning = false;
    logger_1.logger.warn('🛑 Bot manuel olarak durduruldu');
    res.json({ message: 'Bot durduruldu', success: true });
});
/**
 * Botu manuel başlat (opsiyonel)
 */
app.post('/start', (req, res) => {
    if (isBotRunning) {
        return res.json({ message: 'Bot zaten çalışıyor' });
    }
    startArbitrageBot();
    res.json({ message: 'Bot başlatılıyor', success: true });
});
/**
 * Ana route
 */
app.get('/', (req, res) => {
    res.json({
        name: 'Crypto Arbitrage Bot',
        version: '1.0.0',
        status: isBotRunning ? 'running' : 'stopped',
        endpoints: {
            health: '/health',
            status: '/status',
            start: '/start (POST)',
            stop: '/stop (POST)'
        }
    });
});
// Sunucuyu başlat
app.listen(PORT, () => {
    logger_1.logger.info(`🌐 Web server ${PORT} portunda çalışıyor`);
    logger_1.logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
    // Botu otomatik başlat
    startArbitrageBot();
});
// Graceful shutdown
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM sinyali alındı, bot kapatılıyor...');
    isBotRunning = false;
    process.exit(0);
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT sinyali alındı, bot kapatılıyor...');
    isBotRunning = false;
    process.exit(0);
});
