import {describe, it, expect, beforeEach, jest} from '@jest/globals';
import express, {Express} from 'express';
import request from 'supertest';
import scriptRouter from '../script-router';
import {scriptService} from '../script-service';
import {scriptConverterService} from '../script-converter-service';
import {testService} from '@domains/test/test-service';
import {TestStatus} from '@domains/test/test-enums';
import {errorHandler} from '@shared/http/error-handler';
import {NotFoundError} from '@shared/http/errors';

jest.mock('../script-service', () => ({
  scriptService: {
    getScript: jest.fn(),
    getScriptHistory: jest.fn(),
    deleteScript: jest.fn(),
  },
}));

jest.mock('../script-converter-service', () => ({
  scriptConverterService: {
    convertPostman: jest.fn(),
  },
}));

jest.mock('@domains/test/test-service', () => ({
  testService: {
    createTest: jest.fn(),
    getTest: jest.fn(),
  },
}));

jest.mock('@shared/logger/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

describe('Script Router', () => {
  let app: Express;

  const script = {
    scriptId: 'script-1',
    script: 'export default function() {}',
    config: {vus: 3, duration: '30s'},
    createdAt: 1000,
    updatedAt: 1000,
    description: 'baseline',
    tags: ['smoke'],
    folderId: 'folder-1',
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/scripts', scriptRouter);
    app.use(errorHandler);

    jest.clearAllMocks();
  });

  describe('POST /convert/postman', () => {
    it('should convert a Postman collection into a k6 script', async () => {
      (scriptConverterService.convertPostman as jest.Mock).mockImplementation(() => Promise.resolve('converted script'));

      const requestBody = {collection: {info: {name: 'collection'}, item: []}};
      const response = await request(app)
        .post('/api/scripts/convert/postman')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({script: 'converted script'});
      expect(scriptConverterService.convertPostman).toHaveBeenCalledWith(requestBody);
    });
  });

  describe('GET /:scriptId', () => {
    it('should return a stored script', async () => {
      (scriptService.getScript as jest.Mock).mockReturnValue(script);

      const response = await request(app).get('/api/scripts/script-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(script);
      expect(scriptService.getScript).toHaveBeenCalledWith('script-1');
    });

    it('should return 404 when script does not exist', async () => {
      (scriptService.getScript as jest.Mock).mockImplementation(() => {
        throw new NotFoundError('Script not found');
      });

      const response = await request(app).get('/api/scripts/missing');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({error: 'Script not found'});
    });
  });

  describe('POST /:scriptId/run', () => {
    it('should queue a script run using request overrides', async () => {
      (scriptService.getScript as jest.Mock).mockReturnValue(script);
      (testService.createTest as jest.Mock).mockReturnValue('test-1');
      (testService.getTest as jest.Mock).mockReturnValue({
        testId: 'test-1',
        status: TestStatus.SCHEDULED,
        scheduledAt: 2000,
      });

      const response = await request(app)
        .post('/api/scripts/script-1/run')
        .send({
          name: 'nightly run',
          config: {vus: 10, duration: '1m'},
          scheduledAt: '2000',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        testId: 'test-1',
        status: TestStatus.SCHEDULED,
        scheduledAt: 2000,
      });
      expect(testService.createTest).toHaveBeenCalledWith(
        script.script,
        {
          config: {vus: 10, duration: '1m'},
          scriptId: 'script-1',
          name: 'nightly run',
        },
        2000
      );
    });

    it('should fall back to script config and default run name', async () => {
      (scriptService.getScript as jest.Mock).mockReturnValue(script);
      (testService.createTest as jest.Mock).mockReturnValue('test-2');
      (testService.getTest as jest.Mock).mockReturnValue({
        testId: 'test-2',
        status: TestStatus.QUEUED,
      });

      const response = await request(app)
        .post('/api/scripts/script-1/run')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toEqual({testId: 'test-2', status: TestStatus.QUEUED});
      expect(testService.createTest).toHaveBeenCalledWith(
        script.script,
        {
          config: script.config,
          scriptId: 'script-1',
          name: '[script-1] Test Run',
        },
        undefined
      );
    });
  });

  describe('GET /:scriptId/history', () => {
    it('should return limited script history', async () => {
      const tests = [
        {
          testId: 'test-1',
          scriptId: 'script-1',
          status: TestStatus.COMPLETED,
          startTime: 1000,
          endTime: 2000,
          duration: 1000,
          exitCode: 0,
          script: script.script,
          summary: {},
        },
      ];
      (scriptService.getScript as jest.Mock).mockReturnValue(script);
      (scriptService.getScriptHistory as jest.Mock).mockReturnValue(tests);

      const response = await request(app).get('/api/scripts/script-1/history?limit=5');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        scriptId: 'script-1',
        tests,
        count: 1,
      });
      expect(scriptService.getScriptHistory).toHaveBeenCalledWith('script-1', 5);
    });
  });

  describe('DELETE /:scriptId', () => {
    it('should delete a script', async () => {
      (scriptService.deleteScript as jest.Mock).mockReturnValue(undefined);

      const response = await request(app).delete('/api/scripts/script-1');

      expect(response.status).toBe(204);
      expect(response.text).toBe('');
      expect(scriptService.deleteScript).toHaveBeenCalledWith('script-1');
    });
  });
});
