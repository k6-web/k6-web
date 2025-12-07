const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const logger = require('./commons/logger');
const {notFoundHandler, errorHandler} = require('./commons/errorHandler');
const {PORT, K6_BASE_PATH, RESULTS_DIR, SCRIPTS_DIR, MAX_RESULT_FILES} = require('./commons/configs');
const {initializeDirectories} = require('./commons/fileSystem');
const {setupGracefulShutdown} = require('./test/shutdownHandler');

const app = express();

initializeDirectories();

// Security middleware
app.use(helmet());

// CORS
app.use(cors());

// Compression
app.use(compression());

// Body parser
app.use(express.json({limit: '10mb'}));

app.use('/health', require('./health/router'));
app.use('/v1/tests', require('./test/router'));

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`k6 agent listening on port ${PORT}`);
  logger.info(`Base directory: ${K6_BASE_PATH}`);
  logger.info(`Results directory: ${RESULTS_DIR}`);
  logger.info(`Scripts directory: ${SCRIPTS_DIR}`);
  logger.info(`Max result files: ${MAX_RESULT_FILES}`);
});

setupGracefulShutdown();
