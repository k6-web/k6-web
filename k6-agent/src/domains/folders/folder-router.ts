import express from 'express';
import {asyncHandler} from '@shared/http/async-handler';
import {folderService} from './folder-service';
import {testService} from '@domains/test/test-service';
import {scriptService} from '@domains/scripts/script-service';
import {scriptConverterService} from '@domains/scripts/script-converter-service';
import {BadRequestError} from '@shared/http/errors';
import {MAX_SCRIPTS_PER_FOLDER} from '@shared/configs';
import logger from '@shared/logger/logger';
import {CreateFolderRequest, FolderListQuery, ImportPostmanScriptsRequest, UpdateFolderRequest} from './folder-request';
import {FolderListResponse, FolderResponse, FolderWithScriptsResponse, ImportPostmanScriptsResponse} from './folder-response';
import {StatusResponse} from '@domains/test/test-response';
import {ScriptResponse} from '@domains/scripts/script-response';

const folderRouter = express.Router();

const buildAvailableScriptId = (baseId: string, reservedIds: Set<string>): string => {
  let candidate = baseId;
  let suffix = 2;

  while (reservedIds.has(candidate) || scriptService.exists(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  reservedIds.add(candidate);
  return candidate;
};

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
  const scheduledAt = req.body?.scheduledAt !== undefined ? Number(req.body.scheduledAt) : undefined;

  const scripts = folderService.getScriptsByFolder(folderId);

  if (scripts.length === 0) {
    res.json({testIds: [], message: 'No scripts to run in this folder'});
    return;
  }

  const testIds: string[] = [];
  for (const script of scripts) {
    try {
      const testId = testService.createTest(script.script, {
        config: script.config,
        scriptId: script.scriptId,
        name: `${script.scriptId}`,
      }, scheduledAt);
      testIds.push(testId);
    } catch (err) {
      logger.error(`Failed to queue test for script ${script.scriptId}: ${(err as Error).message}`);
    }
  }

  res.json({
    message: `Queued ${testIds.length} tests for sequential execution`,
    count: testIds.length,
    testIds,
    scheduledAt,
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

folderRouter.post('/:folderId/scripts/import/postman', asyncHandler(async (req, res) => {
  const {folderId} = req.params;
  const request = req.body as ImportPostmanScriptsRequest;

  folderService.getFolder(folderId);

  const drafts = scriptConverterService.convertPostmanToScripts(request.collection, request.config);
  const existingScripts = folderService.getScriptsByFolder(folderId);

  if (existingScripts.length + drafts.length > MAX_SCRIPTS_PER_FOLDER) {
    throw new BadRequestError(
      `Import would exceed maximum scripts per folder (${MAX_SCRIPTS_PER_FOLDER}). ` +
      `Current: ${existingScripts.length}, importing: ${drafts.length}`
    );
  }

  const reservedIds = new Set<string>();
  const tags = Array.from(new Set(['postman', ...(request.tags || [])].filter(Boolean)));
  const scripts = [];

  for (const draft of drafts) {
    const scriptId = buildAvailableScriptId(draft.scriptIdBase, reservedIds);
    const script = await scriptService.saveScript(scriptId, {
      script: draft.script,
      config: request.config,
      description: draft.description,
      tags,
      folderId,
    });
    scripts.push(script);
  }

  const response: ImportPostmanScriptsResponse = {
    scripts,
    count: scripts.length,
  };
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
