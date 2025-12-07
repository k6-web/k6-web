import Joi from 'joi';
import {NextFunction, Request, RequestHandler, Response} from 'express';

export const querySchemas = {
  pagination: Joi.object({
    limit: Joi.number().optional().min(1).max(500).default(100),
    cursor: Joi.number().optional(),
  }),
};

export interface K6TestConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string | object;
  vusers: number;
  duration: number;
  rampUp?: number;
  name?: string;
}

export const bodySchemas = {
  createTest: Joi.object({
    script: Joi.string().required().min(1).max(1048576), // Max 1MB
    name: Joi.string().optional().max(255).min(0),
    config: Joi.object({
      url: Joi.string().uri().required(),
      method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS').required(),
      headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
      body: Joi.string().min(0).optional(),
      vusers: Joi.number().min(1).max(10000).required(),
      duration: Joi.number().min(1).required(),
      rampUp: Joi.number().min(0).optional(),
      name: Joi.string().min(0).max(255).optional(),
    }).required(),
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
