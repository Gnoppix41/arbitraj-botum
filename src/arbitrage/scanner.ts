import { Price } from '../exchange/binance';
import { logger } from '../utils/logger';

export interface ArbitrageOpportunity {
    symbol: string;
    buyExchange: string;
    sellExchange: string;
    buyPrice: number;
    sellPrice: number;
    profitPercentage: number;
    profitAmount: number;
    timestamp: number;
}

export interface ExchangePrice {
    exchange: string;
    price: Price;
}

export class ArbitrageScanner {
    private opportunities: ArbitrageOpportunity[] = [];
    private minProfitThreshold = 0.3; // Minimum %0.3 kar (komisyonlar için)
    private tradeAmountUSD = 100; // Varsayılan işlem büyüklüğü $100
    
    /**
     * Çoklu borsalar arasında arbitraj fırsatlarını tara
     * @param pricesByExchange - Her borsanın fiyat listesi
     */
    async scanMultiExchangeOpportunities(
        pricesByExchange: Map<string, Map<string, Price>>
    ): Promise<ArbitrageOpportunity[]> {
        const opportunities: ArbitrageOpportunity[] = [];
        const exchanges = Array.from(pricesByExchange.keys());
        
        // Tüm coin'leri bul (ilk borsadan al)
        const firstExchange = exchanges[0];
        const symbols = pricesByExchange.get(firstExchange) 
            ? Array.from(pricesByExchange.get(firstExchange)!.keys())
            : [];
        
        for (const symbol of symbols) {
            // Her borsa çifti için fiyatları karşılaştır
            for (let i = 0; i < exchanges.length; i++) {
                for (let j = i + 1; j < exchanges.length; j++) {
                    const exchange1 = exchanges[i];
                    const exchange2 = exchanges[j];
                    
                    const price1 = pricesByExchange.get(exchange1)?.get(symbol);
                    const price2 = pricesByExchange.get(exchange2)?.get(symbol);
                    
                    if (!price1 || !price2) continue;
                    
                    // Arbitraj fırsatını kontrol et
                    const opportunity = this.checkArbitrage(
                        symbol,
                        exchange1,
                        exchange2,
                        price1.price,
                        price2.price
                    );
                    
                    if (opportunity && opportunity.profitPercentage >= this.minProfitThreshold) {
                        opportunities.push(opportunity);
                    }
                }
            }
        }
        
        if (opportunities.length > 0) {
            logger.info(`🔍 ${opportunities.length} arbitraj fırsatı bulundu!`);
            opportunities.forEach(opp => {
                logger.info(`   💰 ${opp.symbol}: ${opp.buyExchange} -> ${opp.sellExchange} | Kar: %${opp.profitPercentage.toFixed(2)} ($${opp.profitAmount.toFixed(2)})`);
            });
        }
        
        this.opportunities = opportunities;
        return opportunities;
    }
    
    /**
     * İki borsa arasında arbitraj fırsatı kontrolü
     */
    private checkArbitrage(
        symbol: string,
        exchangeA: string,
        exchangeB: string,
        priceA: number,
        priceB: number
    ): ArbitrageOpportunity | null {
        // Spread hesapla
        const spread = Math.abs(priceA - priceB);
        const percentage = (spread / Math.min(priceA, priceB)) * 100;
        
        // Komisyonları düş (genelde %0.1 - %0.2 arası)
        const feeRate = 0.001; // %0.1 komisyon
        const netPercentage = percentage - (feeRate * 2); // Alış ve satış komisyonu
        
        if (netPercentage <= 0) return null;
        
        // Hangisi daha ucuz?
        const buyPrice = Math.min(priceA, priceB);
        const sellPrice = Math.max(priceA, priceB);
        const buyExchange = priceA < priceB ? exchangeA : exchangeB;
        const sellExchange = priceA < priceB ? exchangeB : exchangeA;
        
        // Potansiyel kar hesapla
        const quantity = this.tradeAmountUSD / buyPrice;
        const profitAmount = (quantity * sellPrice) - (quantity * buyPrice) - (this.tradeAmountUSD * feeRate * 2);
        
        return {
            symbol,
            buyExchange,
            sellExchange,
            buyPrice,
            sellPrice,
            profitPercentage: netPercentage,
            profitAmount: profitAmount,
            timestamp: Date.now()
        };
    }
    
    /**
     * Tek borsa için test modu (demo/simülasyon)
     * @param prices - Tek borsa fiyatları
     */
    async scanOpportunities(prices: Map<string, Price>): Promise<ArbitrageOpportunity[]> {
        // Bu method simülasyon içindir.
        // Gerçek arbitraj için scanMultiExchangeOpportunities kullanın.
        
        const opportunities: ArbitrageOpportunity[] = [];
        
        for (const [symbol, price] of prices) {
            // Test: Sahte ikinci borsa fiyatı üret (%0.1 ile %0.8 arası fark)
            const variance = (Math.random() * 0.7) + 0.1; // %0.1 - %0.8
            const direction = Math.random() > 0.5 ? 1 : -1;
            const fakeOtherExchangePrice = price.price * (1 + (direction * variance / 100));
            
            const opportunity = this.checkArbitrage(
                symbol,
                'Exchange A (Test)',
                'Exchange B (Test)',
                price.price,
                fakeOtherExchangePrice
            );
            
            if (opportunity && opportunity.profitPercentage >= this.minProfitThreshold) {
                opportunities.push(opportunity);
            }
        }
        
        if (opportunities.length > 0) {
            logger.info(`🎯 ${opportunities.length} simülasyon arbitraj fırsatı bulundu!`);
            opportunities.forEach(opp => {
                logger.info(`   💰 ${opp.symbol}: %${opp.profitPercentage.toFixed(2)} kar (simülasyon)`);
            });
        }
        
        return opportunities;
    }
    
    /**
     * Minimum kar eşiğini güncelle
     */
    setMinProfitThreshold(threshold: number): void {
        this.minProfitThreshold = threshold;
        logger.info(`📊 Minimum kar eşiği %${threshold} olarak güncellendi`);
    }
    
    /**
     * İşlem büyüklüğünü güncelle
     */
    setTradeAmount(amountUSD: number): void {
        this.tradeAmountUSD = amountUSD;
        logger.info(`💰 İşlem büyüklüğü $${amountUSD} olarak güncellendi`);
    }
    
    /**
     * Son fırsatları getir
     */
    getLatestOpportunities(): ArbitrageOpportunity[] {
        return [...this.opportunities];
    }
    
    /**
     * Belirli bir coin için fırsat var mı?
     */
    hasOpportunity(symbol: string): boolean {
        return this.opportunities.some(opp => opp.symbol === symbol);
    }
    
    /**
     * En karlı fırsatı getir
     */
    getBestOpportunity(): ArbitrageOpportunity | null {
        if (this.opportunities.length === 0) return null;
        return this.opportunities.reduce((best, current) => 
            current.profitPercentage > best.profitPercentage ? current : best
        );
    }
}

// Export a default instance
export const arbitrageScanner = new ArbitrageScanner();