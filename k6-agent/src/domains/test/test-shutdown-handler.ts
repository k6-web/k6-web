import logger from '@shared/logger/logger';
import {testService} from '@domains/test/test-service';

export function setupGracefulShutdown(): void {
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received. Stopping all tests...');
    testService.getExecutor().stopAllTests();
    process.exit(0);
  });
}
