export interface LogEntry {
  type: 'stdout' | 'stderr' | 'system' | 'error';
  timestamp: number;
  message: string;
}
