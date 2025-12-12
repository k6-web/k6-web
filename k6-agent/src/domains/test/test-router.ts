import express from 'express';
import {asyncHandler} from '@shared/http/async-handler';
import {querySchemas, validateQuery} from '@shared/http/validation';
import {LogEntry} from '@domains/test/test-types';
import {CreateTestRequest, PaginationRequest} from '@domains/test/test-request';
import {RunTestResponse, StatusResponse} from '@domains/test/test-response';
import {testService} from '@domains/test/test-service';

const testRouter = express.Router();

testRouter.post('/', asyncHandler(async (req, res) => {
  const {script, name, config} = req.body as CreateTestRequest;
  const testId = testService.createTest(script, {name, config});
  const response: RunTestResponse = {testId};
  res.json(response);
}));

testRouter.get('/:testId/stream', (req, res) => {
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

testRouter.put('/:testId/stop', asyncHandler(async (req, res) => {
  const testId = req.params.testId;
  testService.stopTest(testId);
  const response: StatusResponse = {status: 'ok'};
  res.json(response);
}));

testRouter.get('/', validateQuery(querySchemas.pagination), asyncHandler(async (req, res) => {
  const query = req.query as unknown as PaginationRequest;
  const limit = query.limit ?? 100;
  const cursor = query.cursor ?? null;

  const result = testService.getAllTests(limit, cursor);
  res.json(result);
}));

testRouter.get('/:testId', asyncHandler(async (req, res) => {
  const testId = req.params.testId;
  const test = testService.getTest(testId);
  res.json(test);
}));

testRouter.delete('/:testId', asyncHandler(async (req, res) => {
  const testId = req.params.testId;
  testService.deleteTest(testId);
  const response: StatusResponse = {status: 'ok'};
  res.json(response);
}));

export default testRouter;
