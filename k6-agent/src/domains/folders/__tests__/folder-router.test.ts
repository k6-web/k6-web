import {describe, it, expect, beforeEach, jest} from '@jest/globals';
import express, {Express} from 'express';
import request from 'supertest';
import folderRouter from '../folder-router';
import {folderService} from '../folder-service';
import {scriptService} from '@domains/scripts/script-service';
import {scriptConverterService} from '@domains/scripts/script-converter-service';
import {testService} from '@domains/test/test-service';
import {errorHandler} from '@shared/http/error-handler';
import logger from '@shared/logger/logger';

jest.mock('../folder-service', () => ({
  folderService: {
    saveFolder: jest.fn(),
    getAllFolders: jest.fn(),
    getFolder: jest.fn(),
    deleteFolder: jest.fn(),
    getScriptsByFolder: jest.fn(),
  },
}));

jest.mock('@domains/scripts/script-service', () => ({
  scriptService: {
    saveScript: jest.fn(),
    getScript: jest.fn(),
    deleteScript: jest.fn(),
    exists: jest.fn(),
  },
}));

jest.mock('@domains/scripts/script-converter-service', () => ({
  scriptConverterService: {
    convertPostmanToScripts: jest.fn(),
  },
}));

jest.mock('@domains/test/test-service', () => ({
  testService: {
    createTest: jest.fn(),
  },
}));

jest.mock('@shared/logger/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

describe('Folder Router', () => {
  let app: Express;

  const folder = {
    folderId: 'folder-1',
    name: 'Checkout',
    description: 'Checkout load tests',
    createdAt: 1000,
    updatedAt: 1000,
  };

  const script = {
    scriptId: 'script-1',
    script: 'export default function() {}',
    config: {vus: 3, duration: '30s'},
    createdAt: 1000,
    updatedAt: 1000,
    folderId: 'folder-1',
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/folders', folderRouter);
    app.use(errorHandler);

    jest.clearAllMocks();
  });

  describe('POST /', () => {
    it('should create a folder', async () => {
      (folderService.saveFolder as jest.Mock).mockImplementation(() => Promise.resolve(folder));

      const response = await request(app)
        .post('/api/folders')
        .send({
          folderId: 'folder-1',
          name: 'Checkout',
          description: 'Checkout load tests',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(folder);
      expect(folderService.saveFolder).toHaveBeenCalledWith('folder-1', {
        name: 'Checkout',
        description: 'Checkout load tests',
      });
    });
  });

  describe('GET /', () => {
    it('should pass sort query to the service', async () => {
      (folderService.getAllFolders as jest.Mock).mockReturnValue([folder]);

      const response = await request(app).get('/api/folders?sortBy=name&sortOrder=asc');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({folders: [folder]});
      expect(folderService.getAllFolders).toHaveBeenCalledWith({
        sortBy: 'name',
        sortOrder: 'asc',
      });
    });
  });

  describe('GET /:folderId', () => {
    it('should return folder details with scripts', async () => {
      (folderService.getFolder as jest.Mock).mockReturnValue(folder);
      (folderService.getScriptsByFolder as jest.Mock).mockReturnValue([script]);

      const response = await request(app).get('/api/folders/folder-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        folder,
        scripts: [script],
        scriptCount: 1,
      });
    });
  });

  describe('PUT /:folderId', () => {
    it('should merge partial updates with existing folder data', async () => {
      const updated = {...folder, name: 'Checkout Critical', updatedAt: 2000};
      (folderService.getFolder as jest.Mock).mockReturnValue(folder);
      (folderService.saveFolder as jest.Mock).mockImplementation(() => Promise.resolve(updated));

      const response = await request(app)
        .put('/api/folders/folder-1')
        .send({name: 'Checkout Critical'});

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updated);
      expect(folderService.saveFolder).toHaveBeenCalledWith('folder-1', {
        name: 'Checkout Critical',
        description: 'Checkout load tests',
      });
    });
  });

  describe('DELETE /:folderId', () => {
    it('should delete a folder', async () => {
      (folderService.deleteFolder as jest.Mock).mockReturnValue(undefined);

      const response = await request(app).delete('/api/folders/folder-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({status: 'ok'});
      expect(folderService.deleteFolder).toHaveBeenCalledWith('folder-1');
    });
  });

  describe('POST /:folderId/run-all', () => {
    it('should return an empty run response when the folder has no scripts', async () => {
      (folderService.getScriptsByFolder as jest.Mock).mockReturnValue([]);

      const response = await request(app)
        .post('/api/folders/folder-1/run-all')
        .send({scheduledAt: 3000});

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        testIds: [],
        message: 'No scripts to run in this folder',
      });
      expect(testService.createTest).not.toHaveBeenCalled();
    });

    it('should queue scripts and continue when one script fails', async () => {
      const secondScript = {...script, scriptId: 'script-2'};
      (folderService.getScriptsByFolder as jest.Mock).mockReturnValue([script, secondScript]);
      (testService.createTest as jest.Mock)
        .mockReturnValueOnce('test-1')
        .mockImplementationOnce(() => {
          throw new Error('k6 unavailable');
        });

      const response = await request(app)
        .post('/api/folders/folder-1/run-all')
        .send({scheduledAt: '3000'});

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Queued 1 tests for sequential execution',
        count: 1,
        testIds: ['test-1'],
        scheduledAt: 3000,
      });
      expect(testService.createTest).toHaveBeenNthCalledWith(
        1,
        script.script,
        {
          config: script.config,
          scriptId: 'script-1',
          name: 'script-1',
        },
        3000
      );
      expect(logger.error).toHaveBeenCalledWith('Failed to queue test for script script-2: k6 unavailable');
    });
  });

  describe('POST /:folderId/scripts', () => {
    it('should create a script inside the folder', async () => {
      const created = {...script, scriptId: 'new-script'};
      (folderService.getFolder as jest.Mock).mockReturnValue(folder);
      (scriptService.saveScript as jest.Mock).mockImplementation(() => Promise.resolve(created));

      const response = await request(app)
        .post('/api/folders/folder-1/scripts')
        .send({
          scriptId: 'new-script',
          script: 'export default function() {}',
          config: {vus: 1},
          description: 'smoke',
          tags: ['critical'],
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(created);
      expect(scriptService.saveScript).toHaveBeenCalledWith('new-script', {
        script: 'export default function() {}',
        config: {vus: 1},
        description: 'smoke',
        tags: ['critical'],
        folderId: 'folder-1',
      });
    });
  });

  describe('POST /:folderId/scripts/import/postman', () => {
    it('should import converted scripts with unique IDs and postman tags', async () => {
      const drafts = [
        {scriptIdBase: 'login', script: 'script one', description: 'Login'},
        {scriptIdBase: 'login', script: 'script two', description: 'Login duplicate'},
      ];
      (folderService.getFolder as jest.Mock).mockReturnValue(folder);
      (folderService.getScriptsByFolder as jest.Mock).mockReturnValue([]);
      (scriptConverterService.convertPostmanToScripts as jest.Mock).mockReturnValue(drafts);
      (scriptService.exists as jest.Mock).mockImplementation((scriptId) => scriptId === 'login-2');
      (scriptService.saveScript as jest.Mock).mockImplementation((scriptId, metadata) => Promise.resolve({
        scriptId,
        ...(metadata as object),
        createdAt: 1000,
        updatedAt: 1000,
      }));

      const response = await request(app)
        .post('/api/folders/folder-1/scripts/import/postman')
        .send({
          collection: {info: {name: 'Postman'}},
          config: {vus: 2},
          tags: ['critical', 'postman'],
        });

      expect(response.status).toBe(201);
      expect(response.body.count).toBe(2);
      expect(response.body.scripts.map((current: {scriptId: string}) => current.scriptId)).toEqual(['login', 'login-3']);
      expect(scriptService.saveScript).toHaveBeenNthCalledWith(1, 'login', {
        script: 'script one',
        config: {vus: 2},
        description: 'Login',
        tags: ['postman', 'critical'],
        folderId: 'folder-1',
      });
      expect(scriptService.saveScript).toHaveBeenNthCalledWith(2, 'login-3', {
        script: 'script two',
        config: {vus: 2},
        description: 'Login duplicate',
        tags: ['postman', 'critical'],
        folderId: 'folder-1',
      });
    });
  });

  describe('PUT /:folderId/scripts/:scriptId', () => {
    it('should reject updates for scripts in another folder', async () => {
      (folderService.getFolder as jest.Mock).mockReturnValue(folder);
      (scriptService.getScript as jest.Mock).mockReturnValue({...script, folderId: 'other-folder'});

      const response = await request(app)
        .put('/api/folders/folder-1/scripts/script-1')
        .send({description: 'changed'});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({error: 'Script does not belong to this folder'});
      expect(scriptService.saveScript).not.toHaveBeenCalled();
    });

    it('should update scripts that belong to the folder', async () => {
      const updated = {...script, description: 'changed', tags: ['updated']};
      (folderService.getFolder as jest.Mock).mockReturnValue(folder);
      (scriptService.getScript as jest.Mock).mockReturnValue(script);
      (scriptService.saveScript as jest.Mock).mockImplementation(() => Promise.resolve(updated));

      const response = await request(app)
        .put('/api/folders/folder-1/scripts/script-1')
        .send({description: 'changed', tags: ['updated']});

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updated);
      expect(scriptService.saveScript).toHaveBeenCalledWith('script-1', {
        script: script.script,
        config: script.config,
        description: 'changed',
        tags: ['updated'],
        folderId: 'folder-1',
      });
    });
  });

  describe('DELETE /:folderId/scripts/:scriptId', () => {
    it('should delete scripts that belong to the folder', async () => {
      (folderService.getFolder as jest.Mock).mockReturnValue(folder);
      (scriptService.getScript as jest.Mock).mockReturnValue(script);
      (scriptService.deleteScript as jest.Mock).mockReturnValue(undefined);

      const response = await request(app).delete('/api/folders/folder-1/scripts/script-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({status: 'ok'});
      expect(scriptService.deleteScript).toHaveBeenCalledWith('script-1');
    });

    it('should reject deletes for scripts in another folder', async () => {
      (folderService.getFolder as jest.Mock).mockReturnValue(folder);
      (scriptService.getScript as jest.Mock).mockReturnValue({...script, folderId: 'other-folder'});

      const response = await request(app).delete('/api/folders/folder-1/scripts/script-1');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({error: 'Script does not belong to this folder'});
      expect(scriptService.deleteScript).not.toHaveBeenCalled();
    });
  });
});
