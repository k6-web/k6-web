import express from 'express';
import {asyncHandler} from '../commons/asyncHandler';
import {BadRequestError, InternalServerError, NotFoundError} from '../commons/errors';
import {querySchemas, validateQuery} from '../commons/validation';
import {deleteTestResult, getAllTestResults, getTestResult} from './resultManager';
import {addLogListener, getAllRunningTests, getRunningTest, removeLogListener, runTest, stopTest,} from './k6Runner';
import {LogEntry} from './types';

const router = express.Router();

router.post('/', asyncHandler(async (req, res) => {
  const script = req.body.script
  const metadata = {
    name: req.body.name,
  };

  const testId = runTest(script, metadata);
  res.json({testId});
}));

router.get('/:testId/stream', (req, res) => {
  const testId = req.params.testId;

  const test = getRunningTest(testId);
  if (!test) {
    res.status(404).json({error: 'Test not found or not running'});
    return;
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable buffering for nginx
  });

  // Send initial logs
  for (const log of test.logs) {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  }

  // Flush the initial response
  if (res.flush && typeof res.flush === 'function') {
    res.flush();
  }

  // Create log listener
  const logListener = (log: LogEntry) => {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
    // Flush after each write
    if (res.flush && typeof res.flush === 'function') {
      res.flush();
    }
  };

  addLogListener(testId, logListener);

  // Send a heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
    if (res.flush && typeof res.flush === 'function') {
      res.flush();
    }
  }, 30000);

  // Clean up on connection close
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    removeLogListener(testId, logListener);
  });
});

router.put('/:testId/stop', asyncHandler(async (req, res) => {
  const testId = req.params.testId;

  if (!getRunningTest(testId)) {
    throw new NotFoundError('Test not found or not running');
  }

  const success = stopTest(testId);

  if (!success) {
    throw new InternalServerError('Failed to stop test');
  }

  res.json({status: 'ok'});
}));

router.get('/', validateQuery(querySchemas.pagination), asyncHandler(async (req, res) => {
  const limit = typeof req.query.limit === 'number' ? req.query.limit : 100;
  const cursor = typeof req.query.cursor === 'number' ? req.query.cursor : null;

  const tests: unknown[] = [];
  const runningTests = getAllRunningTests();

  for (const [testId, test] of runningTests.entries()) {
    tests.push({
      testId,
      status: test.status,
      startTime: test.startTime,
      script: test.script.substring(0, 100) + '...',
      name: test.name,
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
        summary: result.summary,
      });
    }
  }

  const sortedTests = tests.sort((a: any, b: any) => b.startTime - a.startTime);

  let filteredTests = sortedTests;
  if (cursor !== null) {
    const cursorIndex = sortedTests.findIndex((t: any) => t.startTime === cursor);
    if (cursorIndex !== -1) {
      filteredTests = sortedTests.slice(cursorIndex + 1);
    }
  }

  const paginatedTests = filteredTests.slice(0, limit);

  const hasMore = filteredTests.length > limit;
  const nextCursor = hasMore ? (paginatedTests[paginatedTests.length - 1] as any).startTime : null;

  res.json({
    tests: paginatedTests,
    pagination: {
      nextCursor,
      hasMore,
    },
  });
}));

router.get('/:testId', asyncHandler(async (req, res) => {
  const testId = req.params.testId;

  const runningTest = getRunningTest(testId);
  if (runningTest) {
    res.json({
      testId,
      status: runningTest.status,
      startTime: runningTest.startTime,
      script: runningTest.script,
      name: runningTest.name,
    });
    return;
  }

  const result = getTestResult(testId);
  if (result) {
    res.json(result);
    return;
  }

  throw new NotFoundError('Test not found');
}));

router.delete('/:testId', asyncHandler(async (req, res) => {
  const testId = req.params.testId;

  if (getRunningTest(testId)) {
    throw new BadRequestError('Cannot delete result of running test');
  }

  const success = deleteTestResult(testId);

  if (!success) {
    throw new NotFoundError('Result not found');
  }

  res.json({status: 'ok'});
}));

export default router;
