const express = require('express');
const {getAllTestResults, getTestResult, deleteTestResult} = require('./resultManager');
const {
  getAllRunningTests,
  getRunningTest,
  runTest,
  addLogListener,
  removeLogListener, stopTest
} = require('./k6Runner');

const router = express.Router();

router.post('/', (req, res) => {
  const script = req.body.script;
  const metadata = {
    name: req.body.name,
    config: req.body.config
  };

  if (!script) {
    return res.status(400).json({
      error: 'Invalid request. Please provide a k6 script in the request body.'
    });
  }

  try {
    const testId = runTest(script, metadata);
    res.json({testId: testId});
  } catch (err) {
    res.status(500).json({
      error: `Failed to start test: ${err.message}`
    });
  }
});

router.get('/:testId/stream', (req, res) => {
  const testId = req.params.testId;

  const test = getRunningTest(testId);
  if (!test) {
    return res.status(404).json({error: 'Test not found or not running'});
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  for (const log of test.logs) {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  }

  const logListener = (log) => {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  };

  addLogListener(testId, logListener);

  req.on('close', () => {
    removeLogListener(testId, logListener);
  });
});

router.put('/:testId/stop', (req, res) => {
  const testId = req.params.testId;

  if (!getRunningTest(testId)) {
    return res.status(404).json({
      error: 'Test not found or not running'
    });
  }

  try {
    const success = stopTest(testId);

    if (success) {
      res.json({status: 'ok'});
    } else {
      res.status(500).json({error: 'Failed to stop test'});
    }
  } catch (err) {
    res.status(500).json({error: `Failed to stop test: ${err.message}`});
  }
});

router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit || '100');
  const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;

  const tests = [];
  const runningTests = getAllRunningTests();

  for (const [testId, test] of runningTests.entries()) {
    tests.push({
      testId,
      status: test.status,
      startTime: test.startTime,
      script: test.script.substring(0, 100) + '...',
      name: test.name
    });
  }

  const fileResults = getAllTestResults();
  for (const result of fileResults) {
    if (!runningTests.has(result.testId)) {
      tests.push({
        testId: result.testId,
        status: result.status,
        startTime: result.startTime,
        endTime: result.endTime,
        exitCode: result.exitCode,
        name: result.name,
        summary: result.summary
      });
    }
  }

  const sortedTests = tests.sort((a, b) => b.startTime - a.startTime);

  let filteredTests = sortedTests;
  if (cursor !== null) {
    const cursorIndex = sortedTests.findIndex(t => t.startTime === cursor);
    if (cursorIndex !== -1) {
      filteredTests = sortedTests.slice(cursorIndex + 1);
    }
  }

  const paginatedTests = filteredTests.slice(0, limit);

  const hasMore = filteredTests.length > limit;
  const nextCursor = hasMore ? paginatedTests[paginatedTests.length - 1].startTime : null;

  res.json({
    tests: paginatedTests,
    pagination: {
      nextCursor,
      hasMore
    }
  });
});

router.get('/:testId', (req, res) => {
  const testId = req.params.testId;

  const runningTest = getRunningTest(testId);
  if (runningTest) {
    return res.json({
      testId,
      status: runningTest.status,
      startTime: runningTest.startTime,
      script: runningTest.script,
      name: runningTest.name
    });
  }

  const result = getTestResult(testId);
  if (result) {
    return res.json(result);
  }

  res.status(404).json({error: 'Test not found'});
});

router.get('/:testId', (req, res) => {
  const testId = req.params.testId;

  const runningTest = getRunningTest(testId);
  if (runningTest) {
    return res.json({
      testId,
      status: runningTest.status,
      startTime: runningTest.startTime,
      script: runningTest.script,
      name: runningTest.name
    });
  }

  const result = getTestResult(testId);
  if (result) {
    return res.json(result);
  }

  res.status(404).json({error: 'Test not found'});
});

router.delete('/:testId', (req, res) => {
  const testId = req.params.testId;

  if (getRunningTest(testId)) {
    return res.status(400).json({
      error: 'Cannot delete result of running test'
    });
  }

  try {
    const success = deleteTestResult(testId);

    if (success) {
      res.json({status: 'ok'});
    } else {
      res.status(404).json({error: 'Result not found'});
    }
  } catch (err) {
    res.status(500).json({
      error: `Failed to delete result: ${err.message}`
    });
  }
});

module.exports = router;

