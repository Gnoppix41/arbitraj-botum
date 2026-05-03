import WebSocket from 'ws';
import crypto from 'crypto';
import { config } from '../../config';

export class BinanceTradeWS {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private pendingRequests = new Map<string, (response: any) => void>();
  private requestId = 0;
  private baseUrl: string;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(private apiKey: string, private apiSecret: string) {
    this.baseUrl = config.binance.wsTradeUrl;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      this.ws = new WebSocket(this.baseUrl);
      this.ws.on('open', () => {
        console.log('✅ Trade WebSocket bağlandı');
        this.isConnected = true;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        resolve();
      });
      this.ws.on('message', (data) => this.handleMessage(data));
      this.ws.on('error', (err) => {
        console.error('Trade WS hatası:', err);
        reject(err);
      });
      this.ws.on('close', () => {
        console.log('Trade WS kapandı, yeniden bağlanmayı dene...');
        this.isConnected = false;
        this.reconnectTimer = setTimeout(() => this.connect().catch(console.error), 5000);
      });
    });
  }

  private handleMessage(data: WebSocket.Data) {
    try {
      const response = JSON.parse(data.toString());
      if (response.id && this.pendingRequests.has(response.id)) {
        const callback = this.pendingRequests.get(response.id);
        if (callback) callback(response);
        this.pendingRequests.delete(response.id);
      } else {
        // Olası ping/pong veya diğer mesajlar
        if (response.result || response.error) {
          console.log('İşlenmemiş yanıt:', response);
        }
      }
    } catch (err) {
      console.error('Mesaj parse hatası:', err);
    }
  }

  private sign(params: Record<string, string | number>): string {
    const queryString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');
  }

  private sendRequest(method: string, params: Record<string, any>): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.ws) {
        reject(new Error('WebSocket bağlı değil'));
        return;
      }
      const id = (++this.requestId).toString();
      const request = { id, method, params };
      this.pendingRequests.set(id, (response) => {
        if (response.error) {
          reject(new Error(`API hatası: ${response.error.code} - ${response.error.msg}`));
        } else if (response.status && response.status !== 200) {
          reject(new Error(`HTTP hata: ${response.status}`));
        } else {
          resolve(response.result);
        }
      });
      this.ws!.send(JSON.stringify(request));
    });
  }

  async placeMarketOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number): Promise<any> {
    const timestamp = Date.now();
    const recvWindow = 5000;
    const params = {
      apiKey: this.apiKey,
      symbol: symbol.toUpperCase(),
      side,
      type: 'MARKET',
      quantity: quantity.toString(),
      timestamp,
      recvWindow
    };
    const signature = this.sign(params);
    const fullParams = { ...params, signature };
    return this.sendRequest('order.place', fullParams);
  }

  public disconnect() {
    if (this.ws) this.ws.close();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }
}