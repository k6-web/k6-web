import logger from '../commons/logger';
import {stopAllTests} from './k6Runner';

export function setupGracefulShutdown(): void {
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received. Stopping all tests...');
    stopAllTests();
    process.exit(0);
  });
}
