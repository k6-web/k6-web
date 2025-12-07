const {stopAllTests} = require('../services/testExecutionService');

function setupGracefulShutdown() {
    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received. Stopping all tests...');
        stopAllTests();
        process.exit(0);
    });
}

module.exports = {
    setupGracefulShutdown
};

