import express from 'express';
import {asyncHandler} from '@shared/asyncHandler';
import {scriptService} from './ScriptService';
import {testService} from '@domains/test/service';
import {CreateScriptRequest, RunScriptRequest, ScriptListQuery, UpdateScriptRequest,} from './dto/request';
import {ScriptHistoryResponse, ScriptListResponse, ScriptResponse,} from './dto/response';
import {RunTestResponse, StatusResponse} from '@domains/test/dto/response';

const router = express.Router();

router.post('/', asyncHandler(async (req, res) => {
  const request = req.body as CreateScriptRequest;
  const script = await scriptService.saveScript(request.scriptId, {
    name: request.name,
    script: request.script,
    config: request.config,
    description: request.description,
    tags: request.tags,
  });
  const response: ScriptResponse = script;
  res.status(201).json(response);
}));

router.get('/', asyncHandler(async (req, res) => {
  const query = req.query as unknown as ScriptListQuery;
  const tags = query.tags ? query.tags.split(',').map(t => t.trim()) : undefined;

  const scripts = scriptService.getAllScripts({
    tags,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  const response: ScriptListResponse = {scripts};
  res.json(response);
}));

router.get('/:scriptId', asyncHandler(async (req, res) => {
  const {scriptId} = req.params;
  const script = scriptService.getScript(scriptId);
  const response: ScriptResponse = script;
  res.json(response);
}));

router.put('/:scriptId', asyncHandler(async (req, res) => {
  const {scriptId} = req.params;
  const request = req.body as UpdateScriptRequest;

  const existing = scriptService.getScript(scriptId);

  const updated = await scriptService.saveScript(scriptId, {
    name: request.name ?? existing.name,
    script: request.script ?? existing.script,
    config: request.config ?? existing.config,
    description: request.description ?? existing.description,
    tags: request.tags ?? existing.tags,
  });

  const response: ScriptResponse = updated;
  res.json(response);
}));

router.delete('/:scriptId', asyncHandler(async (req, res) => {
  const {scriptId} = req.params;
  scriptService.deleteScript(scriptId);
  const response: StatusResponse = {status: 'ok'};
  res.json(response);
}));

router.post('/:scriptId/run', asyncHandler(async (req, res) => {
  const {scriptId} = req.params;
  const request = req.body as RunScriptRequest;

  const script = scriptService.getScript(scriptId);

  const config = request.config ?? script.config;

  const testId = testService.createTest(script.script, {
    name: script.name,
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
    scriptName: script.name,
    tests,
    count: tests.length,
  };
  res.json(response);
}));

export default router;
