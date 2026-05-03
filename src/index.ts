import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { BinanceExchange } from './exchange/binance';
import { ArbitrageScanner } from './arbitrage/scanner';
import { logger } from './utils/logger';

// Environment variables yükle
dotenv.config();

// Express uygulaması
const app = express();
const PORT = process.env.PORT || 10000;

// Bot durumu
let isBotRunning = false;
let botStartTime: Date | null = null;

// Initialize exchanges
const binance = new BinanceExchange();

// Initialize arbitrage scanner
const scanner = new ArbitrageScanner();

/**
 * Ana arbitraj döngüsü
 */
async function startArbitrageBot() {
    logger.info('🚀 Arbitraj botu başlatılıyor...');
    botStartTime = new Date();
    isBotRunning = true;

    try {
        // Borsalara bağlan
        await binance.connect();
        logger.info('✅ Binance bağlantısı kuruldu');

        // Arbitraj döngüsü (her 5 saniyede bir)
        setInterval(async () => {
            if (!isBotRunning) return;

            try {
                // Fiyatları al
                const prices = await binance.getPrices(['BTCUSDT', 'ETHUSDT', 'BNBUSDT']);
                
                // Arbitraj fırsatlarını tara
                const opportunities = await scanner.scanOpportunities(prices);
                
                if (opportunities.length > 0) {
                    logger.info(`🎯 ${opportunities.length} arbitraj fırsatı bulundu!`);
                    
                    // Fırsatları değerlendir
                    for (const opp of opportunities) {
                        if (opp.profitPercentage > 0.5) { // %0.5'ten yüksek kar
                            logger.info(`💰 Fırsat: ${opp.symbol} - %${opp.profitPercentage.toFixed(2)} kar`);
                            await executeArbitrage(opp);
                        }
                    }
                } else {
                    logger.debug('📊 Aktif arbitraj fırsatı yok');
                }
                
            } catch (error) {
                logger.error('Arbitraj döngüsünde hata:', error);
            }
        }, 5000); // 5 saniye

    } catch (error) {
        logger.error('Bot başlatma hatası:', error);
        isBotRunning = false;
    }
}

/**
 * Arbitraj işlemini gerçekleştir
 */
async function executeArbitrage(opportunity: any) {
    // Buraya gerçek işlem kodlarını ekleyin
    logger.info(`💸 İşlem gerçekleştiriliyor: ${opportunity.symbol}`);
    // Burada API key'lerinizle işlem yapabilirsiniz
}

/**
 * Health check endpoint - Render için kritik!
 */
app.get('/health', (req: Request, res: Response) => {
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
app.get('/status', (req: Request, res: Response) => {
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
app.post('/stop', (req: Request, res: Response) => {
    if (!isBotRunning) {
        return res.json({ message: 'Bot zaten durdurulmuş' });
    }
    
    isBotRunning = false;
    logger.warn('🛑 Bot manuel olarak durduruldu');
    res.json({ message: 'Bot durduruldu', success: true });
});

/**
 * Botu manuel başlat (opsiyonel)
 */
app.post('/start', (req: Request, res: Response) => {
    if (isBotRunning) {
        return res.json({ message: 'Bot zaten çalışıyor' });
    }
    
    startArbitrageBot();
    res.json({ message: 'Bot başlatılıyor', success: true });
});

/**
 * Ana route
 */
app.get('/', (req: Request, res: Response) => {
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
    logger.info(`🌐 Web server ${PORT} portunda çalışıyor`);
    logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
    
    // Botu otomatik başlat
    startArbitrageBot();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM sinyali alındı, bot kapatılıyor...');
    isBotRunning = false;
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT sinyali alındı, bot kapatılıyor...');
    isBotRunning = false;
    process.exit(0);
});