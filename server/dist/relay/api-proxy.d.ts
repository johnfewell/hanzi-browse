import { WebSocket } from 'ws';
export declare function hasPendingProxy(ws: WebSocket): boolean;
export declare function handleApiProxy(ws: WebSocket, msg: any, log?: (message: string) => void): Promise<void>;
