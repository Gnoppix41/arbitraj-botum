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
// Configuration
const PORT = parseInt(process.env.PORT || '10000');
const TEST_MODE = process.env.NODE_ENV !== 'production'; // Test modu varsayılan
const TRADE_AMOUNT_USD = parseFloat(process.env.TRADE_AMOUNT_USD || '100');
const MIN_PROFIT_PERCENTAGE = parseFloat(process.env.MIN_PROFIT_PERCENTAGE || '0.5');
const SCAN_INTERVAL_MS = parseInt(process.env.SCAN_INTERVAL_MS || '5000');
// API Key'ler (Render'dan veya .env'den al)
const BINANCE_API_KEY = process.env.BINANCE_API_KEY || '';
const BINANCE_SECRET_KEY = process.env.BINANCE_SECRET_KEY || '';
// Uyarı: API key yoksa bot işlem yapamaz
if (!BINANCE_API_KEY || !BINANCE_SECRET_KEY) {
    logger_1.logger.warn('⚠️ Binance API key\'leri bulunamadı! Bot TEST modunda çalışacak, GERÇEK İŞLEM YAPILMAYACAK.');
}
// Initialize
const app = (0, express_1.default)();
let isBotRunning = false;
let botStartTime = null;
let totalTrades = 0;
let totalProfit = 0;
// Initialize exchange
const binance = new binance_1.BinanceExchange(BINANCE_API_KEY, BINANCE_SECRET_KEY, TEST_MODE);
// Configure scanner
scanner_1.arbitrageScanner.setMinProfitThreshold(MIN_PROFIT_PERCENTAGE);
scanner_1.arbitrageScanner.setTradeAmount(TRADE_AMOUNT_USD);
/**
 * İşLEM YÖNETİCİSİ - Arbitraj fırsatında işlem yapar
 */
async function executeArbitrageTrade(opportunity) {
    // Test modunda işlem yapma
    if (TEST_MODE || !BINANCE_API_KEY) {
        logger_1.logger.info(`🔍 [TEST MODU] İşlem yapılmadı: ${opportunity.symbol} - %${opportunity.profitPercentage.toFixed(2)} kar potansiyeli`);
        return false;
    }
    try {
        logger_1.logger.info(`🚀 GERÇEK İŞLEM BAŞLATILIYOR: ${opportunity.symbol}`);
        // Önce bakiyeyi kontrol et
        const balance = await binance.getAccountBalance('USDT');
        if (balance < TRADE_AMOUNT_USD) {
            logger_1.logger.error(`❌ Yetersiz bakiye: ${balance} USDT (Gereken: ${TRADE_AMOUNT_USD})`);
            return false;
        }
        // 1. UCUZ BORSADAN ALIM YAP
        logger_1.logger.info(`📈 ALIM: ${opportunity.buyExchange} - ${opportunity.quantity} ${opportunity.symbol} @ $${opportunity.buyPrice}`);
        const buyOrder = await binance.marketBuy(opportunity.symbol, opportunity.quantity);
        if (!buyOrder || buyOrder.status !== 'FILLED') {
            logger_1.logger.error('❌ Alım başarısız!');
            return false;
        }
        logger_1.logger.info(`✅ Alım başarılı! Order ID: ${buyOrder.orderId}`);
        // Kısa bir bekle (işlemin tamamlanması için)
        await new Promise(resolve => setTimeout(resolve, 1000));
        // 2. PAHALI BORSADAN SATIŞ YAP (NOT: Aynı borsada yapıyoruz - gerçek arbitrajda farklı borsalar olacak)
        // Not: Gerçek arbitrajda burada farklı bir borsaya bağlanmanız gerekir.
        // Bu örnek aynı borsa üzerinden test içindir.
        logger_1.logger.info(`📉 SATIŞ: ${opportunity.sellExchange} - ${opportunity.quantity} ${opportunity.symbol} @ $${opportunity.sellPrice}`);
        const sellOrder = await binance.marketSell(opportunity.symbol, opportunity.quantity);
        if (!sellOrder || sellOrder.status !== 'FILLED') {
            logger_1.logger.error('❌ Satış başarısız!');
            // Reversal işlemi gerekebilir (manuel müdahale)
            return false;
        }
        logger_1.logger.info(`✅ Satış başarılı! Order ID: ${sellOrder.orderId}`);
        // İstatistikleri güncelle
        totalTrades++;
        totalProfit += opportunity.profitAmount;
        logger_1.logger.info(`🎉 ARBITRAJ BAŞARILI! Kar: $${opportunity.profitAmount.toFixed(2)}`);
        logger_1.logger.info(`📊 Toplam Kar: $${totalProfit.toFixed(2)} | Toplam İşlem: ${totalTrades}`);
        return true;
    }
    catch (error) {
        logger_1.logger.error('İşlem sırasında hata:', error);
        return false;
    }
}
/**
 * ANA ARBITRAJ DÖNGÜSÜ
 */
async function startArbitrageBot() {
    logger_1.logger.info('🚀 Arbitraj botu başlatılıyor...');
    logger_1.logger.info(`📊 Konfigürasyon:`);
    logger_1.logger.info(`   - Mod: ${TEST_MODE ? 'TEST (Simülasyon)' : 'GERÇEK İŞLEM'}`);
    logger_1.logger.info(`   - İşlem Miktarı: $${TRADE_AMOUNT_USD}`);
    logger_1.logger.info(`   - Min Kar Eşiği: %${MIN_PROFIT_PERCENTAGE}`);
    logger_1.logger.info(`   - Tarama Aralığı: ${SCAN_INTERVAL_MS}ms`);
    botStartTime = new Date();
    isBotRunning = true;
    try {
        // Binance bağlantısı kur
        await binance.connect();
        if (!TEST_MODE && BINANCE_API_KEY) {
            const balance = await binance.getAccountBalance('USDT');
            logger_1.logger.info(`💰 USDT Bakiyesi: $${balance}`);
            if (balance < TRADE_AMOUNT_USD) {
                logger_1.logger.warn(`⚠️ UYARI: Bakiye ($${balance}) işlem miktarından ($${TRADE_AMOUNT_USD}) düşük!`);
            }
        }
        // Arbitraj döngüsü
        setInterval(async () => {
            if (!isBotRunning)
                return;
            try {
                // Fiyatları al (BTC, ETH, BNB)
                const prices = await binance.getPrices(['BTCUSDT', 'ETHUSDT', 'BNBUSDT']);
                // Arbitraj fırsatlarını tara
                const opportunities = await scanner_1.arbitrageScanner.scanOpportunities(prices);
                if (opportunities.length > 0) {
                    // En iyi fırsatı al
                    const bestOpp = opportunities[0];
                    if (bestOpp.profitPercentage >= MIN_PROFIT_PERCENTAGE) {
                        logger_1.logger.info(`🎯 Fırsat tespit edildi! %${bestOpp.profitPercentage.toFixed(2)} kar`);
                        // İşlemi gerçekleştir
                        await executeArbitrageTrade(bestOpp);
                    }
                }
            }
            catch (error) {
                logger_1.logger.error('Arbitraj döngüsünde hata:', error);
            }
        }, SCAN_INTERVAL_MS);
    }
    catch (error) {
        logger_1.logger.error('Bot başlatma hatası:', error);
        isBotRunning = false;
    }
}
/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        botRunning: isBotRunning,
        mode: TEST_MODE ? 'TEST (simülasyon)' : 'GERÇEK İŞLEM',
        uptime: botStartTime ? Math.floor((Date.now() - botStartTime.getTime()) / 1000) : 0,
        stats: {
            totalTrades,
            totalProfit: totalProfit.toFixed(2),
            lastUpdate: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
    });
});
/**
Detaylı durum endpoint'i
*/
app.get('/status', (req, res) => {
    res.json({
        running: isBotRunning,
        mode: TEST_MODE ? 'TEST' : 'LIVE',
        startTime: botStartTime,
        config: {
            tradeAmountUSD: TRADE_AMOUNT_USD,
            minProfitPercentage: MIN_PROFIT_PERCENTAGE,
            scanIntervalMs: SCAN_INTERVAL_MS
        },
        stats: {
            totalTrades,
            totalProfit: totalProfit.toFixed(2),
            currentBalance: isBotRunning && !TEST_MODE ? 'check /balance' : 'N/A'
        }
    });
});
/**
 * Bakiye kontrol endpoint'i
 */
app.get('/balance', async (req, res) => {
    if (TEST_MODE || !BINANCE_API_KEY) {
        return res.json({ mode: 'TEST', balance: 'Simülasyon modunda, gerçek bakiye gösterilmiyor' });
    }
    try {
        const balance = await binance.getAccountBalance('USDT');
        res.json({ asset: 'USDT', balance: balance, timestamp: new Date().toISOString() });
    }
    catch (error) {
        res.status(500).json({ error: 'Bakiye çekilemedi' });
    }
});
/**
 * Botu durdur
 */
app.post('/stop', (req, res) => {
    if (!isBotRunning) {
        return res.json({ message: 'Bot zaten durdurulmuş' });
    }
    isBotRunning = false;
    logger_1.logger.warn('🛑 Bot durduruldu');
    res.json({ message: 'Bot durduruldu', success: true });
});
/**
 * Botu başlat
 */
app.post('/start', (req, res) => {
    if (isBotRunning) {
        return res.json({ message: 'Bot zaten çalışıyor' });
    }
    startArbitrageBot();
    res.json({ message: 'Bot başlatılıyor', success: true });
});
/**
 * Ana sayfa
 */
app.get('/', (req, res) => {
    res.json({
        name: 'Crypto Arbitrage Bot',
        version: '2.0.0',
        mode: TEST_MODE ? 'TEST (simülasyon)' : 'LIVE (gerçek işlem)',
        status: isBotRunning ? 'running' : 'stopped',
        endpoints: {
            health: '/health',
            status: '/status',
            balance: '/balance',
            start: '/start (POST)',
            stop: '/stop (POST)'
        }
    });
});
// Sunucuyu başlat
app.listen(PORT, () => {
    logger_1.logger.info(`🌐 Web server ${PORT} portunda çalışıyor`);
    logger_1.logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
    logger_1.logger.info(`📊 Mod: ${TEST_MODE ? 'TEST (simülasyon)' : 'GERÇEK İŞLEM'}`);
    if (TEST_MODE || !BINANCE_API_KEY) {
        logger_1.logger.warn('⚠️ UYARI: Bot TEST modunda çalışıyor, GERÇEK PARA İLE İŞLEM YAPILMAYACAK!');
        logger_1.logger.warn('⚠️ Gerçek işlem için Render\'da BINANCE_API_KEY ve BINANCE_SECRET_KEY değişkenlerini ayarlayın.');
    }
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
