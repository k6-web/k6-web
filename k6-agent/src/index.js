const express = require('express');
const cors = require('cors');
const logger = require('./commons/logger');
const {PORT, K6_BASE_PATH, RESULTS_DIR, SCRIPTS_DIR, MAX_RESULT_FILES} = require('./commons/configs');
const {initializeDirectories} = require('./commons/fileSystem');
const {setupGracefulShutdown} = require('./test/shutdownHandler');

const app = express();

initializeDirectories();

app.use(cors());
app.use(express.json());

app.use('/health', require('./health/router'));
app.use('/v1/tests', require('./test/router'));

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`k6 agent listening on port ${PORT}`);
  logger.info(`Base directory: ${K6_BASE_PATH}`);
  logger.info(`Results directory: ${RESULTS_DIR}`);
  logger.info(`Scripts directory: ${SCRIPTS_DIR}`);
  logger.info(`Max result files: ${MAX_RESULT_FILES}`);
});

setupGracefulShutdown();
