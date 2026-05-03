import WebSocket from 'ws';
import EventEmitter from 'events';

interface DepthEvent {
  stream: string;
  data: {
    e: string;
    E: number;
    s?: string;
    U: number;
    u: number;
    b?: [string, string][];
    a?: [string, string][];
  };
}

export class BinanceWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private streams: string[] = [];
  private reconnectInterval = 5000;
  private isManualClose = false;

  constructor(private baseUrl: string = 'wss://stream.binance.com:9443/stream') {
    super();
  }

  public connect(streams: string[]) {
    this.streams = streams;
    this.isManualClose = false;
    const streamNames = streams.join('/');
    const url = `${this.baseUrl}?streams=${streamNames}`;
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('✅ WebSocket bağlantısı başarıyla açıldı');
      this.emit('connected');
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.data && parsed.stream) {
          this.handleDepthEvent(parsed as DepthEvent);
        }
      } catch (err) {
        console.error('Mesaj işleme hatası:', err);
      }
    });

    this.ws.on('error', (error) => {
      console.error('❌ WebSocket hatası:', error);
      this.emit('error', error);
      if (!this.isManualClose) this.reconnect();
    });

    this.ws.on('close', (code, reason) => {
      if (!this.isManualClose) this.reconnect();
    });
  }

  private handleDepthEvent(event: DepthEvent) {
    const symbolFromStream = event.stream.split('@')[0];
    const symbol = event.data.s ? event.data.s.toLowerCase() : symbolFromStream;
    const bids = Array.isArray(event.data.b) ? event.data.b : [];
    const asks = Array.isArray(event.data.a) ? event.data.a : [];
    this.emit('depth', {
      symbol,
      bids,
      asks,
      firstUpdateId: event.data.U,
      finalUpdateId: event.data.u,
      eventTime: event.data.E
    });
  }

  private reconnect() {
    setTimeout(() => {
      this.connect(this.streams);
    }, this.reconnectInterval);
  }

  public disconnect() {
    this.isManualClose = true;
    if (this.ws) this.ws.close();
  }
}