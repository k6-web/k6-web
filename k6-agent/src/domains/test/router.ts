import express from 'express';
import {asyncHandler} from '@shared/asyncHandler';
import {querySchemas, validateQuery} from '@shared/validation';
import {LogEntry} from '@domains/test/models/types';
import {CreateTestRequest, PaginationRequest} from '@domains/test/dto/request';
import {RunTestResponse, StatusResponse} from '@domains/test/dto/response';
import {testService} from '@domains/test/service';

const router = express.Router();

router.post('/', asyncHandler(async (req, res) => {
  const {script, name, config} = req.body as CreateTestRequest;
  const testId = testService.createTest(script, {name, config});
  const response: RunTestResponse = {testId};
  res.json(response);
}));

router.get('/:testId/stream', (req, res) => {
  const testId = req.params.testId;
  const executor = testService.getExecutor();

  const test = executor.getRunningTest(testId);
  if (!test) {
    res.status(404).json({error: 'Test not found or not running'});
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  for (const log of test.logs) {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  }

  if (res.flush && typeof res.flush === 'function') {
    res.flush();
  }

  const logListener = (log: LogEntry) => {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
    // Flush after each write
    if (res.flush && typeof res.flush === 'function') {
      res.flush();
    }
  };

  executor.addLogListener(testId, logListener);

  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
    if (res.flush && typeof res.flush === 'function') {
      res.flush();
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    executor.removeLogListener(testId, logListener);
  });
});

router.put('/:testId/stop', asyncHandler(async (req, res) => {
  const testId = req.params.testId;
  testService.stopTest(testId);
  const response: StatusResponse = {status: 'ok'};
  res.json(response);
}));

router.get('/', validateQuery(querySchemas.pagination), asyncHandler(async (req, res) => {
  const query = req.query as unknown as PaginationRequest;
  const limit = query.limit ?? 100;
  const cursor = query.cursor ?? null;

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
  const response: StatusResponse = {status: 'ok'};
  res.json(response);
}));

export default router;
