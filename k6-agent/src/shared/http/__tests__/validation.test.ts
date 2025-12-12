import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {NextFunction, Request, Response} from 'express';
import {querySchemas, validateQuery} from '../validation';

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
