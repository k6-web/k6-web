import logger from '@shared/logger';
import {stopAllTests} from '@domains/test/k6Runner';

export function setupGracefulShutdown(): void {
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received. Stopping all tests...');
    stopAllTests();
    process.exit(0);
  });
}
