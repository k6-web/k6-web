import {describe, it, expect, beforeEach} from '@jest/globals';
import express, {Express} from 'express';
import request from 'supertest';
import healthRouter from '../health-router';

describe('Health Router', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/health', healthRouter);
  });

  describe('GET /', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should return ISO 8601 timestamp', async () => {
      const response = await request(app).get('/health');

      const timestamp = response.body.timestamp;
      const date = new Date(timestamp);

      expect(date.toISOString()).toBe(timestamp);
    });
  });
});
