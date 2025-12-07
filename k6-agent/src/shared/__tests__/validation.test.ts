import {describe, it, expect, jest, beforeEach} from '@jest/globals';
import {Request, Response, NextFunction} from 'express';
import {validateBody, validateQuery, bodySchemas, querySchemas} from '../validation';

describe('Validation', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    mockNext = jest.fn() as NextFunction;
  });

  describe('validateBody', () => {
    describe('createTest schema', () => {
      it('should validate valid request body', () => {
        mockReq.body = {
          script: 'export default function() {}',
          name: 'Test name',
          config: {
            url: 'https://example.com',
            method: 'GET',
            vusers: 10,
            duration: 30,
          },
        };

        const middleware = validateBody(bodySchemas.createTest);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should validate request without optional fields', () => {
        mockReq.body = {
          script: 'export default function() {}',
        };

        const middleware = validateBody(bodySchemas.createTest);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject missing script', () => {
        mockReq.body = {
          name: 'Test',
        };

        const middleware = validateBody(bodySchemas.createTest);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation error',
            details: expect.any(Array),
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject empty script', () => {
        mockReq.body = {
          script: '',
        };

        const middleware = validateBody(bodySchemas.createTest);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should reject script exceeding max length', () => {
        mockReq.body = {
          script: 'a'.repeat(1048577), // 1MB + 1
        };

        const middleware = validateBody(bodySchemas.createTest);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should reject invalid config url', () => {
        mockReq.body = {
          script: 'export default function() {}',
          config: {
            url: 'not-a-url',
            method: 'GET',
            vusers: 10,
            duration: 30,
          },
        };

        const middleware = validateBody(bodySchemas.createTest);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should reject invalid HTTP method', () => {
        mockReq.body = {
          script: 'export default function() {}',
          config: {
            url: 'https://example.com',
            method: 'INVALID',
            vusers: 10,
            duration: 30,
          },
        };

        const middleware = validateBody(bodySchemas.createTest);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should validate all valid HTTP methods', () => {
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

        methods.forEach(method => {
          mockReq.body = {
            script: 'export default function() {}',
            config: {
              url: 'https://example.com',
              method,
              vusers: 10,
              duration: 30,
            },
          };

          const middleware = validateBody(bodySchemas.createTest);
          middleware(mockReq as Request, mockRes as Response, mockNext);

          expect(mockNext).toHaveBeenCalled();
          jest.clearAllMocks();
        });
      });

      it('should reject vusers below minimum', () => {
        mockReq.body = {
          script: 'export default function() {}',
          config: {
            url: 'https://example.com',
            method: 'GET',
            vusers: 0,
            duration: 30,
          },
        };

        const middleware = validateBody(bodySchemas.createTest);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should reject vusers above maximum', () => {
        mockReq.body = {
          script: 'export default function() {}',
          config: {
            url: 'https://example.com',
            method: 'GET',
            vusers: 10001,
            duration: 30,
          },
        };

        const middleware = validateBody(bodySchemas.createTest);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should reject non-integer vusers', () => {
        mockReq.body = {
          script: 'export default function() {}',
          config: {
            url: 'https://example.com',
            method: 'GET',
            vusers: 10.5,
            duration: 30,
          },
        };

        const middleware = validateBody(bodySchemas.createTest);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should validate optional headers', () => {
        mockReq.body = {
          script: 'export default function() {}',
          config: {
            url: 'https://example.com',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer token',
            },
            vusers: 10,
            duration: 30,
          },
        };

        const middleware = validateBody(bodySchemas.createTest);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should validate optional body as string', () => {
        mockReq.body = {
          script: 'export default function() {}',
          config: {
            url: 'https://example.com',
            method: 'POST',
            body: '{"key":"value"}',
            vusers: 10,
            duration: 30,
          },
        };

        const middleware = validateBody(bodySchemas.createTest);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should validate optional body as object', () => {
        mockReq.body = {
          script: 'export default function() {}',
          config: {
            url: 'https://example.com',
            method: 'POST',
            body: {key: 'value'},
            vusers: 10,
            duration: 30,
          },
        };

        const middleware = validateBody(bodySchemas.createTest);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should validate optional rampUp', () => {
        mockReq.body = {
          script: 'export default function() {}',
          config: {
            url: 'https://example.com',
            method: 'GET',
            vusers: 10,
            duration: 30,
            rampUp: 5,
          },
        };

        const middleware = validateBody(bodySchemas.createTest);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('validateQuery', () => {
    describe('pagination schema', () => {
      it('should validate valid query parameters', () => {
        mockReq.query = {
          limit: '50',
          cursor: '12345',
        };

        const middleware = validateQuery(querySchemas.pagination);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should use default limit if not provided', () => {
        mockReq.query = {};

        const middleware = validateQuery(querySchemas.pagination);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect((mockReq.query as any).limit).toBe(100);
      });

      it('should accept optional cursor', () => {
        mockReq.query = {
          limit: '25',
        };

        const middleware = validateQuery(querySchemas.pagination);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject limit below minimum', () => {
        mockReq.query = {
          limit: '0',
        };

        const middleware = validateQuery(querySchemas.pagination);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should reject limit above maximum', () => {
        mockReq.query = {
          limit: '501',
        };

        const middleware = validateQuery(querySchemas.pagination);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });
  });
});
