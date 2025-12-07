import Joi from 'joi';
import {Request, Response, NextFunction, RequestHandler} from 'express';

export const querySchemas = {
  pagination: Joi.object({
    limit: Joi.number().optional().min(1).max(500).default(100),
    cursor: Joi.number().optional(),
  }),
};

export const bodySchemas = {
  createTest: Joi.object({
    script: Joi.string().required().min(1).max(1048576), // Max 1MB
    name: Joi.string().optional().max(255),
    config: Joi.object({
      vus: Joi.number().optional().min(1).max(10000),
      duration: Joi.string().optional().pattern(/^\d+[smh]$/),
      iterations: Joi.number().optional().min(1),
    }).optional(),
  }),
};

export function validateBody(schema: Joi.ObjectSchema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const {error, value} = schema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message),
      });
      return;
    }
    req.body = value;
    next();
  };
}

export function validateQuery(schema: Joi.ObjectSchema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const {error, value} = schema.validate(req.query);
    if (error) {
      res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message),
      });
      return;
    }
    req.query = value;
    next();
  };
}
