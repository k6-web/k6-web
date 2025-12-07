import {Request, Response, NextFunction} from 'express';
import logger from './logger';
import {AppError} from './errors';

interface ValidationError extends Error {
  details?: unknown;
}

// 404 handler
export function notFoundHandler(req: Request, res: Response, _: NextFunction): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
}

// Global error handler
export function errorHandler(err: AppError | ValidationError | Error, req: Request, res: Response, _: NextFunction): void {
  const appError = err as AppError;
  const validationError = err as ValidationError;

  if (appError.statusCode >= 500 || !appError.isOperational) {
    logger.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      statusCode: appError.statusCode,
      path: req.path,
      method: req.method,
      body: req.body,
    });
  } else {
    logger.warn('Client error:', {
      message: err.message,
      statusCode: appError.statusCode,
      path: req.path,
      method: req.method,
    });
  }

  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation Error',
      details: validationError.details,
    });
    return;
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
}
