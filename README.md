# Üçgen Arbitraj Botu

Bu bot, Binance ve Kraken borsalarında üçgen arbitraj fırsatlarını gerçek zamanlı olarak tespit edip otomatik işlem yapar. WebSocket tabanlı düşük gecikmeli mimari, gelişmiş risk yönetimi, dashboard, Telegram bildirimleri, Prometheus metrikleri ve backtest desteği içerir.

## Özellikler

- WebSocket ile gerçek zamanlı order book takibi
- Üçgen arbitraj döngüleri (aynı borsa ve borsalar arası)
- Slippage hesaplama ve akıllı işlem büyüklüğü
- Gelişmiş risk yönetimi (Kelly Criterion, ATR, drawdown)
- PostgreSQL ile işlem geçmişi ve performans metrikleri
- Dashboard (anlık fırsatlar, işlemler, risk durumu)
- Telegram bildirimleri
- Prometheus + Grafana ile izleme
- Backtest motoru
- Docker ve CI/CD desteği

## Kurulum

### Ön Koşullar

- Node.js v18 veya üzeri
- npm
- Docker (opsiyonel, PostgreSQL için)
- Git

### Otomatik Kurulum (Önerilen)

Proje klasöründe aşağıdaki komutu çalıştırın:

**Windows (PowerShell):**
```powershell
.\setup.ps1