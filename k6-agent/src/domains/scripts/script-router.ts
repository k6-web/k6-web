import express from 'express';
import {asyncHandler} from '@shared/http/async-handler';
import {scriptService} from './script-service';
import {testService} from '@domains/test/test-service';
import {RunScriptRequest} from './script-request';
import {ScriptHistoryResponse, ScriptResponse} from './script-response';
import {RunTestResponse} from '@domains/test/test-response';

const scriptRouter = express.Router();

scriptRouter.get('/:scriptId', asyncHandler(async (req, res) => {
  const {scriptId} = req.params;
  const script = scriptService.getScript(scriptId);
  const response: ScriptResponse = script;
  res.json(response);
}));

scriptRouter.post('/:scriptId/run', asyncHandler(async (req, res) => {
  const {scriptId} = req.params;
  const request = req.body as RunScriptRequest;

  const script = scriptService.getScript(scriptId);

  const config = request.config ?? script.config;

  const testId = testService.createTest(script.script, {
    config,
    scriptId: script.scriptId,
    name: request.name || `[${script.scriptId}] Test Run`,
  });

  const response: RunTestResponse = {testId};
  res.json(response);
}));

scriptRouter.get('/:scriptId/history', asyncHandler(async (req, res) => {
  const {scriptId} = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

  const script = scriptService.getScript(scriptId);
  const tests = scriptService.getScriptHistory(scriptId, limit);

  const response: ScriptHistoryResponse = {
    scriptId: script.scriptId,
    tests,
    count: tests.length,
  };
  res.json(response);
}));

export default scriptRouter;
