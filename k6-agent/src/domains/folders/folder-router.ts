import express from 'express';
import {asyncHandler} from '@shared/http/async-handler';
import {folderService} from './folder-service';
import {testService} from '@domains/test/test-service';
import {scriptService} from '@domains/scripts/script-service';
import {CreateFolderRequest, FolderListQuery, UpdateFolderRequest} from './folder-request';
import {FolderListResponse, FolderResponse, FolderWithScriptsResponse} from './folder-response';
import {StatusResponse} from '@domains/test/test-response';
import {ScriptResponse} from '@domains/scripts/script-response';

const folderRouter = express.Router();

folderRouter.post('/', asyncHandler(async (req, res) => {
  const request = req.body as CreateFolderRequest;
  const folder = await folderService.saveFolder(request.folderId, {
    name: request.name,
    description: request.description,
  });
  const response: FolderResponse = folder;
  res.status(201).json(response);
}));

folderRouter.get('/', asyncHandler(async (req, res) => {
  const query = req.query as unknown as FolderListQuery;

  const folders = folderService.getAllFolders({
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  const response: FolderListResponse = {folders};
  res.json(response);
}));

folderRouter.get('/:folderId', asyncHandler(async (req, res) => {
  const {folderId} = req.params;
  const folder = folderService.getFolder(folderId);
  const scripts = folderService.getScriptsByFolder(folderId);

  const response: FolderWithScriptsResponse = {
    folder,
    scripts,
    scriptCount: scripts.length,
  };
  res.json(response);
}));

folderRouter.put('/:folderId', asyncHandler(async (req, res) => {
  const {folderId} = req.params;
  const request = req.body as UpdateFolderRequest;

  const existing = folderService.getFolder(folderId);

  const updated = await folderService.saveFolder(folderId, {
    name: request.name ?? existing.name,
    description: request.description ?? existing.description,
  });

  const response: FolderResponse = updated;
  res.json(response);
}));

folderRouter.delete('/:folderId', asyncHandler(async (req, res) => {
  const {folderId} = req.params;
  folderService.deleteFolder(folderId);
  const response: StatusResponse = {status: 'ok'};
  res.json(response);
}));

folderRouter.post('/:folderId/run-all', asyncHandler(async (req, res) => {
  const {folderId} = req.params;

  const scripts = folderService.getScriptsByFolder(folderId);

  if (scripts.length === 0) {
    res.json({testIds: [], message: 'No scripts to run in this folder'});
    return;
  }

  // 즉시 응답 반환
  res.json({
    message: `Queued ${scripts.length} tests for sequential execution`,
    count: scripts.length,
  });

  // 백그라운드에서 순차 실행
  setImmediate(async () => {
    for (const script of scripts) {
      try {
        const testId = testService.createTest(script.script, {
          config: script.config,
          scriptId: script.scriptId,
          name: `${script.scriptId}`,
        });

        // 테스트 완료 대기
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            try {
              const test = testService.getTest(testId);
              if (test.status === 'completed' || test.status === 'failed' || test.status === 'stopped') {
                clearInterval(checkInterval);
                resolve(null);
              }
            } catch (err) {
              clearInterval(checkInterval);
              resolve(null);
            }
          }, 1000);
        });
      } catch (err) {
        const logger = require('@shared/logger/logger').default;
        logger.error(`Failed to run test for script ${script.scriptId}: ${(err as Error).message}`);
      }
    }
  });
}));

folderRouter.post('/:folderId/scripts', asyncHandler(async (req, res) => {
  const {folderId} = req.params;
  const request = req.body;

  folderService.getFolder(folderId);

  const script = await scriptService.saveScript(request.scriptId, {
    script: request.script,
    config: request.config,
    description: request.description,
    tags: request.tags,
    folderId: folderId,
  });

  const response: ScriptResponse = script;
  res.status(201).json(response);
}));

folderRouter.put('/:folderId/scripts/:scriptId', asyncHandler(async (req, res) => {
  const {folderId, scriptId} = req.params;
  const request = req.body;

  folderService.getFolder(folderId);

  const existing = scriptService.getScript(scriptId);

  if (existing.folderId !== folderId) {
    res.status(400).json({error: 'Script does not belong to this folder'});
    return;
  }

  const updated = await scriptService.saveScript(scriptId, {
    script: request.script ?? existing.script,
    config: request.config ?? existing.config,
    description: request.description ?? existing.description,
    tags: request.tags ?? existing.tags,
    folderId: folderId,
  });

  const response: ScriptResponse = updated;
  res.json(response);
}));

folderRouter.delete('/:folderId/scripts/:scriptId', asyncHandler(async (req, res) => {
  const {folderId, scriptId} = req.params;

  folderService.getFolder(folderId);

  const existing = scriptService.getScript(scriptId);

  if (existing.folderId !== folderId) {
    res.status(400).json({error: 'Script does not belong to this folder'});
    return;
  }

  scriptService.deleteScript(scriptId);
  const response: StatusResponse = {status: 'ok'};
  res.json(response);
}));

export default folderRouter;
