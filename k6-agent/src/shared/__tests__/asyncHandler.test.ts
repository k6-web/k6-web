import {describe, expect, it, jest} from '@jest/globals';
import {asyncHandler} from '../asyncHandler';
import {NextFunction, Request, Response} from 'express';

describe('asyncHandler', () => {
  it('should call the async function and handle successful execution', async () => {
    const mockReq = {} as Request;
    const mockRes = {} as Response;
    const mockNext = jest.fn() as unknown as NextFunction;

    const asyncFn = jest.fn(async (_req: Request, _res: Response, _next: NextFunction) => {
      return 'success';
    });

    const handler = asyncHandler(asyncFn as any);
    await handler(mockReq, mockRes, mockNext);

    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should catch errors and pass them to next', async () => {
    const mockReq = {} as Request;
    const mockRes = {} as Response;
    const mockNext = jest.fn() as unknown as NextFunction;

    const error = new Error('Test error');
    const asyncFn = jest.fn(async (_req: Request, _res: Response, _next: NextFunction) => {
      throw error;
    });

    const handler = asyncHandler(asyncFn as any);
    await handler(mockReq, mockRes, mockNext);

    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should work with functions that return void', async () => {
    const mockReq = {} as Request;
    const mockRes = {json: jest.fn()} as unknown as Response;
    const mockNext = jest.fn() as unknown as NextFunction;

    const asyncFn = jest.fn(async (_req: Request, res: Response, _next: NextFunction) => {
      (res as any).json({message: 'success'});
    });

    const handler = asyncHandler(asyncFn as any);
    await handler(mockReq, mockRes, mockNext);

    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect((mockRes as any).json).toHaveBeenCalledWith({message: 'success'});
    expect(mockNext).not.toHaveBeenCalled();
  });
});
