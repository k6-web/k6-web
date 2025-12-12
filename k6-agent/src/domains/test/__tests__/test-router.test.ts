import {describe, it, expect, beforeEach, jest} from '@jest/globals';
import express, {Express} from 'express';
import request from 'supertest';
import testRouter from '../test-router';
import {testService} from '../test-service';
import {TestStatus} from '../test-enums';
import {BadRequestError, NotFoundError} from '@shared/http/errors';

jest.mock('../test-service', () => ({
  testService: {
    createTest: jest.fn(),
    getTest: jest.fn(),
    getAllTests: jest.fn(),
    stopTest: jest.fn(),
    deleteTest: jest.fn(),
    getExecutor: jest.fn(),
  },
}));

describe('Test Router', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/tests', testRouter);

    jest.clearAllMocks();
  });

  describe('POST /', () => {
    it('should create a test with valid request', async () => {
      const mockTestId = 'test-123';
      (testService.createTest as jest.Mock).mockReturnValue(mockTestId);

      const response = await request(app)
        .post('/api/tests')
        .send({
          script: 'export default function() {}',
          name: 'My Test',
          config: {vus: 10},
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({testId: mockTestId});
    });

    it('should handle missing script', async () => {
      (testService.createTest as jest.Mock).mockImplementation(() => {
        throw new BadRequestError('Script is required');
      });

      const response = await request(app)
        .post('/api/tests')
        .send({name: 'My Test'});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /:testId', () => {
    it('should return test info for existing test', async () => {
      const mockTest = {
        testId: 'test-123',
        status: TestStatus.RUNNING,
        startTime: Date.now(),
        script: 'test script',
        logs: [],
      };

      (testService.getTest as jest.Mock).mockReturnValue(mockTest);

      const response = await request(app).get('/api/tests/test-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTest);
    });

    it('should return 404 for non-existent test', async () => {
      (testService.getTest as jest.Mock).mockImplementation(() => {
        throw new NotFoundError('Test not found');
      });

      const response = await request(app).get('/api/tests/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /', () => {
    it('should return paginated list of tests', async () => {
      const mockResponse = {
        tests: [
          {
            testId: 'test-1',
            status: TestStatus.COMPLETED,
            startTime: Date.now(),
            endTime: Date.now() + 1000,
            exitCode: 0,
            script: 'script 1',
          },
        ],
        pagination: {
          nextCursor: null,
          hasMore: false,
        },
      };

      (testService.getAllTests as jest.Mock).mockReturnValue(mockResponse);

      const response = await request(app).get('/api/tests');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
    });

    it('should apply pagination parameters', async () => {
      const mockResponse = {
        tests: [],
        pagination: {
          nextCursor: null,
          hasMore: false,
        },
      };

      (testService.getAllTests as jest.Mock).mockReturnValue(mockResponse);

      await request(app).get('/api/tests?limit=10&cursor=1234567890');

      expect(testService.getAllTests).toHaveBeenCalledWith(10, 1234567890);
    });
  });

  describe('PUT /:testId/stop', () => {
    it('should stop a running test', async () => {
      (testService.stopTest as jest.Mock).mockReturnValue(undefined);

      const response = await request(app).put('/api/tests/test-123/stop');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({status: 'ok'});
      expect(testService.stopTest).toHaveBeenCalledWith('test-123');
    });

    it('should return 404 if test not found', async () => {
      (testService.stopTest as jest.Mock).mockImplementation(() => {
        throw new NotFoundError('Test not found');
      });

      const response = await request(app).put('/api/tests/non-existent/stop');

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /:testId', () => {
    it('should delete a test result', async () => {
      (testService.deleteTest as jest.Mock).mockReturnValue(undefined);

      const response = await request(app).delete('/api/tests/test-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({status: 'ok'});
      expect(testService.deleteTest).toHaveBeenCalledWith('test-123');
    });

    it('should return 404 if test not found', async () => {
      (testService.deleteTest as jest.Mock).mockImplementation(() => {
        throw new NotFoundError('Test result not found');
      });

      const response = await request(app).delete('/api/tests/non-existent');

      expect(response.status).toBe(404);
    });

    it('should return 400 if test is running', async () => {
      (testService.deleteTest as jest.Mock).mockImplementation(() => {
        throw new BadRequestError('Cannot delete running test');
      });

      const response = await request(app).delete('/api/tests/test-123');

      expect(response.status).toBe(400);
    });
  });
});
