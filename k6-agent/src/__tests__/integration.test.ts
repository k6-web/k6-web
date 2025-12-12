import {describe, it, expect, beforeAll} from '@jest/globals';
import express, {Express} from 'express';
import request from 'supertest';
import healthRouter from '@domains/health/health-router';
import {errorHandler, notFoundHandler} from '@shared/http/error-handler';

describe('Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/health', healthRouter);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });


  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/health')
        .set('Content-Type', 'application/json')
        .send('invalid json {{{');

      expect([400, 500]).toContain(response.status);
    });
  });

});
