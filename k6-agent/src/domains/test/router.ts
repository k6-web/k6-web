import express from 'express';
import {asyncHandler} from '../../shared/asyncHandler';
import {bodySchemas, querySchemas, validateBody, validateQuery} from '../../shared/validation';
import {addLogListener, getRunningTest, removeLogListener} from './k6Runner';
import {LogEntry} from './types';
import {testService} from './testService';

const router = express.Router();

router.post('/', validateBody(bodySchemas.createTest), asyncHandler(async (req, res) => {
  const {script, name, config} = req.body;
  const testId = testService.createTest(script, {name, config});
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
  testService.stopTest(testId);
  res.json({status: 'ok'});
}));

router.get('/', validateQuery(querySchemas.pagination), asyncHandler(async (req, res) => {
  const limit = typeof req.query.limit === 'number' ? req.query.limit : 100;
  const cursor = typeof req.query.cursor === 'number' ? req.query.cursor : null;

  const result = testService.getAllTests(limit, cursor);
  res.json(result);
}));

router.get('/:testId', asyncHandler(async (req, res) => {
  const testId = req.params.testId;
  const test = testService.getTest(testId);
  res.json(test);
}));

router.delete('/:testId', asyncHandler(async (req, res) => {
  const testId = req.params.testId;
  testService.deleteTest(testId);
  res.json({status: 'ok'});
}));

export default router;
