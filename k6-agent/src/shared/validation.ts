import Joi from 'joi';
import {NextFunction, Request, RequestHandler, Response} from 'express';

export const querySchemas = {
  pagination: Joi.object({
    limit: Joi.number().optional().min(1).max(500).default(100),
    cursor: Joi.number().optional(),
  }),
};

export const bodySchemas = {
  createTest: Joi.object({
    script: Joi.string().required().min(1).max(1048576), // Max 1MB
    name: Joi.string().optional().max(255).min(0),
    config: Joi.object({
      url: Joi.string().uri().required(),
      method: Joi.string()
        .valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS')
        .required(),
      headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
      body: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),
      vusers: Joi.number().integer().min(1).max(10000).required(),
      duration: Joi.number().integer().min(1).max(86400).required(), // in seconds
      rampUp: Joi.number().integer().min(0).max(86400).optional(), // in seconds
      name: Joi.string().min(0).max(255).optional(),
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
