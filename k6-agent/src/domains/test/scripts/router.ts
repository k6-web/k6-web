import express from 'express';
import {asyncHandler} from '@shared/asyncHandler';
import {scriptService} from './ScriptService';
import {testService} from '@domains/test/service';
import {RunScriptRequest} from './dto/request';
import {ScriptHistoryResponse, ScriptResponse} from './dto/response';
import {RunTestResponse} from '@domains/test/dto/response';

const router = express.Router();

router.get('/:scriptId', asyncHandler(async (req, res) => {
  const {scriptId} = req.params;
  const script = scriptService.getScript(scriptId);
  const response: ScriptResponse = script;
  res.json(response);
}));

router.post('/:scriptId/run', asyncHandler(async (req, res) => {
  const {scriptId} = req.params;
  const request = req.body as RunScriptRequest;

  const script = scriptService.getScript(scriptId);

  const config = request.config ?? script.config;

  const testId = testService.createTest(script.script, {
    config,
    scriptId: script.scriptId,
  });

  const response: RunTestResponse = {testId};
  res.json(response);
}));

router.get('/:scriptId/history', asyncHandler(async (req, res) => {
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

export default router;
