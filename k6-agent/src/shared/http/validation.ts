import Joi from 'joi';
import {NextFunction, Request, RequestHandler, Response} from 'express';

export const querySchemas = {
  pagination: Joi.object({
    limit: Joi.number().optional().min(1).max(500).default(100),
    cursor: Joi.number().optional(),
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
    // Express 5 exposes req.query as a getter, so shadow it with the validated value.
    Object.defineProperty(req, 'query', {value, writable: true, enumerable: true, configurable: true});
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
