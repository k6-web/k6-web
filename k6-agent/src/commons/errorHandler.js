const logger = require('./logger');
const {AppError} = require('./errors');

// 404 handler
function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
}

// Global error handler
function errorHandler(err, req, res, next) {
  // Log error details
  if (err.statusCode >= 500 || !err.isOperational) {
    logger.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      body: req.body,
    });
  } else {
    logger.warn('Client error:', {
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });
  }

  // Handle operational errors (expected errors)
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Handle validation errors from Joi
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details,
    });
  }

  // Handle unexpected errors
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
