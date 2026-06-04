import { WebSocketServer } from 'ws';
import { createServer } from 'http';
export class MockRelay {
    httpServer;
    wss;
    clients = new Set();
    received = [];
    port = 0;
    constructor() {
        this.httpServer = createServer();
        this.wss = new WebSocketServer({ server: this.httpServer });
        this.wss.on('connection', (ws) => {
            this.clients.add(ws);
            ws.on('message', (raw) => {
                try {
                    this.received.push(JSON.parse(raw.toString()));
                }
                catch { }
            });
            ws.on('close', () => this.clients.delete(ws));
        });
    }
    static async start() {
        const relay = new MockRelay();
        await new Promise((resolve) => relay.httpServer.listen(0, '127.0.0.1', resolve));
        relay.port = relay.httpServer.address().port;
        return relay;
    }
    emit(message) {
        const payload = JSON.stringify(message);
        for (const ws of this.clients) {
            if (ws.readyState === ws.OPEN)
                ws.send(payload);
        }
    }
    async stop() {
        for (const ws of this.clients)
            ws.terminate();
        await new Promise((resolve) => this.wss.close(() => resolve()));
        await new Promise((resolve) => this.httpServer.close(() => resolve()));
    }
}
