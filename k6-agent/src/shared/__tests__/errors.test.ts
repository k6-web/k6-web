import {describe, it, expect} from '@jest/globals';
import {AppError, BadRequestError, NotFoundError, InternalServerError} from '../errors';

describe('Errors', () => {
  describe('AppError', () => {
    it('should create error with status code', () => {
      const error = new AppError('Test error', 500);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('Error');
    });

    it('should create error with custom status code', () => {
      const error = new AppError('Custom error', 418);

      expect(error.statusCode).toBe(418);
      expect(error.isOperational).toBe(true);
    });

    it('should be instance of Error', () => {
      const error = new AppError('Test', 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });

    it('should have stack trace', () => {
      const error = new AppError('Test', 500);

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });

  describe('BadRequestError', () => {
    it('should create 400 error with custom message', () => {
      const error = new BadRequestError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('should create 400 error with default message', () => {
      const error = new BadRequestError();

      expect(error.message).toBe('Bad Request');
      expect(error.statusCode).toBe(400);
    });

    it('should be instance of AppError', () => {
      const error = new BadRequestError('Test');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(BadRequestError);
    });
  });

  describe('NotFoundError', () => {
    it('should create 404 error with custom message', () => {
      const error = new NotFoundError('Resource not found');

      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should create 404 error with default message', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
    });

    it('should be instance of AppError', () => {
      const error = new NotFoundError('Test');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
    });
  });

  describe('InternalServerError', () => {
    it('should create 500 error with custom message', () => {
      const error = new InternalServerError('Server error');

      expect(error.message).toBe('Server error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should create 500 error with default message', () => {
      const error = new InternalServerError();

      expect(error.message).toBe('Internal Server Error');
      expect(error.statusCode).toBe(500);
    });

    it('should be instance of AppError', () => {
      const error = new InternalServerError('Test');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(InternalServerError);
    });
  });

  describe('Error differentiation', () => {
    it('should differentiate between error types', () => {
      const badRequest = new BadRequestError('Bad');
      const notFound = new NotFoundError('Not found');
      const serverError = new InternalServerError('Error');

      expect(badRequest.statusCode).toBe(400);
      expect(notFound.statusCode).toBe(404);
      expect(serverError.statusCode).toBe(500);

      expect(badRequest).not.toBe(notFound);
      expect(badRequest).not.toBe(serverError);
    });
  });
});
