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
    quantity: number;
    timestamp: number;
}

export interface TradeSignal {
    symbol: string;
    action: 'BUY' | 'SELL' | 'NONE';
    exchange: string;
    price: number;
    quantity: number;
    expectedProfit: number;
    reason: string;
}

export class ArbitrageScanner {
    private opportunities: ArbitrageOpportunity[] = [];
    private minProfitThreshold = 0.5;
    private tradeAmountUSD = 100;
    private feeRate = 0.001;

    checkArbitrageOpportunity(
        symbol: string,
        priceA: number,
        priceB: number,
        exchangeA: string,
        exchangeB: string
    ): ArbitrageOpportunity | null {
        const spread = Math.abs(priceA - priceB);
        const percentage = (spread / Math.min(priceA, priceB)) * 100;
        const netProfitPercentage = percentage - (this.feeRate * 2 * 100);

        if (netProfitPercentage <= 0) return null;

        const buyPrice = Math.min(priceA, priceB);
        const sellPrice = Math.max(priceA, priceB);
        const buyExchange = priceA < priceB ? exchangeA : exchangeB;
        const sellExchange = priceA < priceB ? exchangeB : exchangeA;

        const quantity = this.tradeAmountUSD / buyPrice;
        const buyCost = quantity * buyPrice;
        const sellRevenue = quantity * sellPrice;
        const feeCost = (buyCost + sellRevenue) * this.feeRate;
        const netProfit = sellRevenue - buyCost - feeCost;

        if (netProfitPercentage < this.minProfitThreshold) return null;

        return {
            symbol,
            buyExchange,
            sellExchange,
            buyPrice,
            sellPrice,
            profitPercentage: netProfitPercentage,
            profitAmount: netProfit,
            quantity,
            timestamp: Date.now()
        };
    }

    scanMultiExchangeOpportunities(
        pricesByExchange: Map<string, Map<string, Price>>
    ): ArbitrageOpportunity[] {
        const opportunities: ArbitrageOpportunity[] = [];
        const exchanges = Array.from(pricesByExchange.keys());

        const firstExchange = exchanges[0];
        const pricesMap = pricesByExchange.get(firstExchange);
        if (!pricesMap) return [];

        const symbols = Array.from(pricesMap.keys());

        for (const symbol of symbols) {
            for (let i = 0; i < exchanges.length; i++) {
                for (let j = i + 1; j < exchanges.length; j++) {
                    const exchange1 = exchanges[i];
                    const exchange2 = exchanges[j];

                    const priceData1 = pricesByExchange.get(exchange1)?.get(symbol);
                    const priceData2 = pricesByExchange.get(exchange2)?.get(symbol);

                    if (!priceData1 || !priceData2) continue;

                    const opportunity = this.checkArbitrageOpportunity(
                        symbol,
                        priceData1.price,
                        priceData2.price,
                        exchange1,
                        exchange2
                    );

                    if (opportunity) opportunities.push(opportunity);
                }
            }
        }

        opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);

        if (opportunities.length > 0) {
            logger.info(`🎯 ${opportunities.length} arbitraj fırsatı bulundu!`);
        }

        this.opportunities = opportunities;
        return opportunities;
    }

    async scanOpportunities(prices: Map<string, Price>): Promise<ArbitrageOpportunity[]> {
        const opportunities: ArbitrageOpportunity[] = [];

        for (const [symbol, price] of prices) {
            const variance = (Math.random() * 0.7) + 0.1;
            const direction = Math.random() > 0.5 ? 1 : -1;
            const fakePrice = price.price * (1 + (direction * variance / 100));

            const opportunity = this.checkArbitrageOpportunity(
                symbol,
                price.price,
                fakePrice,
                'Binance (Gerçek)',
                'Test Borsası (Simülasyon)'
            );

            if (opportunity) opportunities.push(opportunity);
        }

        if (opportunities.length > 0) {
            logger.info(`🎲 ${opportunities.length} SIMÜLASYON fırsatı bulundu!`);
        }

        return opportunities;
    }

    generateTradeSignal(opportunity: ArbitrageOpportunity): TradeSignal {
        return {
            symbol: opportunity.symbol,
            action: 'BUY',
            exchange: opportunity.buyExchange,
            price: opportunity.buyPrice,
            quantity: opportunity.quantity,
            expectedProfit: opportunity.profitAmount,
            reason: `${opportunity.buyExchange} fiyatı $${opportunity.buyPrice}, ${opportunity.sellExchange} fiyatı $${opportunity.sellPrice}`
        };
    }

    setMinProfitThreshold(threshold: number): void {
        this.minProfitThreshold = threshold;
        logger.info(`📊 Minimum kar eşiği %${threshold} olarak güncellendi`);
    }

    setTradeAmount(amountUSD: number): void {
        this.tradeAmountUSD = amountUSD;
        logger.info(`💰 İşlem büyüklüğü $${amountUSD} olarak güncellendi`);
    }

    getLatestOpportunities(): ArbitrageOpportunity[] {
        return [...this.opportunities];
    }

    getBestOpportunity(): ArbitrageOpportunity | null {
        if (this.opportunities.length === 0) return null;
        return this.opportunities[0];
    }

    hasOpportunity(symbol: string): boolean {
        return this.opportunities.some(opp => opp.symbol === symbol);
    }
}

export const arbitrageScanner = new ArbitrageScanner();