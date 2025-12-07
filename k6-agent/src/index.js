const express = require('express');
const cors = require('cors');
const {PORT, K6_BASE_PATH, RESULTS_DIR, SCRIPTS_DIR, MAX_RESULT_FILES} = require('./commons/configs');
const {initializeDirectories} = require('./commons/utils/fileSystem');
const {setupGracefulShutdown} = require('./test/shutdownHandler');

const app = express();

initializeDirectories();

app.use(cors());

app.use(express.json());

app.use('/health', require('./health/router'));
app.use('/v1/tests', require('./test/router'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`k6 agent listening on port ${PORT}`);
  console.log(`Base directory: ${K6_BASE_PATH}`);
  console.log(`Results directory: ${RESULTS_DIR}`);
  console.log(`Scripts directory: ${SCRIPTS_DIR}`);
  console.log(`Max result files: ${MAX_RESULT_FILES}`);
});

setupGracefulShutdown();
