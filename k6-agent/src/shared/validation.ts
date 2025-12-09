import Joi from 'joi';
import {NextFunction, Request, RequestHandler, Response} from 'express';

export const querySchemas = {
  pagination: Joi.object({
    limit: Joi.number().optional().min(1).max(500).default(100),
    cursor: Joi.number().optional(),
  }),
};

export const bodySchemas = {
  createScript: Joi.object({
    scriptId: Joi.string().optional().pattern(/^[a-z0-9-]+$/),
    name: Joi.string().required().min(1).max(100),
    script: Joi.string().required().min(1),
    config: Joi.object({
      vus: Joi.number().optional().min(1),
      duration: Joi.string().optional(),
      iterations: Joi.number().optional().min(1),
    }).optional(),
    description: Joi.string().optional().max(500),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
  }),

  updateScript: Joi.object({
    name: Joi.string().optional().min(1).max(100),
    script: Joi.string().optional().min(1),
    config: Joi.object({
      vus: Joi.number().optional().min(1),
      duration: Joi.string().optional(),
      iterations: Joi.number().optional().min(1),
    }).optional(),
    description: Joi.string().optional().max(500),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
  }),

  compareTests: Joi.object({
    testIds: Joi.array().items(Joi.string()).min(2).required(),
    baselineIndex: Joi.number().optional().min(0),
  }),

  runScript: Joi.object({
    config: Joi.object({
      vus: Joi.number().optional().min(1),
      duration: Joi.string().optional(),
      iterations: Joi.number().optional().min(1),
    }).optional(),
  }),
};

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
