const express = require('express');
const cors = require('cors');
const {PORT, K6_BASE_PATH, RESULTS_DIR, SCRIPTS_DIR, MAX_RESULT_FILES} = require('./config/constants');
const {initializeDirectories} = require('./utils/fileSystem');
const {setupGracefulShutdown} = require('./utils/shutdown');

const healthRoute = require('./routes/health');
const testsRoute = require('./routes/tests');
const runRoute = require('./routes/run');
const stopRoute = require('./routes/stop');
const stopAllRoute = require('./routes/stopAll');
const resultsRoute = require('./routes/results');

const app = express();

initializeDirectories();

app.use(cors());

app.use(express.json());
app.use(express.text());

app.use('/', healthRoute);
app.use('/tests', testsRoute);
app.use('/run', runRoute);
app.use('/stream', runRoute);
app.use('/stop', stopRoute);
app.use('/stop-all', stopAllRoute);
app.use('/results', resultsRoute);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`k6 agent listening on port ${PORT}`);
    console.log(`Base directory: ${K6_BASE_PATH}`);
    console.log(`Results directory: ${RESULTS_DIR}`);
    console.log(`Scripts directory: ${SCRIPTS_DIR}`);
    console.log(`Max result files: ${MAX_RESULT_FILES}`);
    console.log('');
    console.log('Available endpoints:');
    console.log(`  GET  /health              - Health check`);
    console.log(`  POST /run                 - Start test with custom k6 script`);
    console.log(`  GET  /tests               - List all tests`);
    console.log(`  GET  /tests/:testId       - Get test status`);
    console.log(`  GET  /tests/:testId/result - Get test result`);
    console.log(`  GET  /stream/:testId      - Stream test logs (SSE)`);
    console.log(`  POST /stop/:testId        - Stop running test`);
    console.log(`  POST /stop-all            - Stop all running tests`);
    console.log(`  DELETE /results/:testId   - Delete test result`);
});

setupGracefulShutdown();
