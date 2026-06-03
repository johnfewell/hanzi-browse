export declare class MockRelay {
    private httpServer;
    private wss;
    private clients;
    received: any[];
    port: number;
    private constructor();
    static start(): Promise<MockRelay>;
    emit(message: any): void;
    stop(): Promise<void>;
}
