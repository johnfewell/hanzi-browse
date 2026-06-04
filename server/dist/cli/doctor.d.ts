import { type CredentialSource } from './detect-credentials.js';
import type { SessionFileStatus } from './session-files.js';
export interface DoctorReport {
    extensionConnected: boolean;
    relayReachable: boolean;
    credentials: CredentialSource[];
    recentSessions: SessionFileStatus[];
}
export declare function runDoctor(): Promise<DoctorReport>;
export declare function renderDoctorReport(r: DoctorReport): string;
