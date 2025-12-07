const logger = require('../commons/logger');
const {stopAllTests} = require('./k6Runner');

function setupGracefulShutdown() {
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received. Stopping all tests...');
    stopAllTests();
    process.exit(0);
  });
}

module.exports = {
  setupGracefulShutdown
};

