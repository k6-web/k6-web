const Joi = require('joi');

const testSchemas = {
  runTest: Joi.object({
    script: Joi.string().required().min(1).max(1000000),
    name: Joi.string().optional().max(255),
    config: Joi.object({
      vus: Joi.number().optional().min(1).max(10000),
      duration: Joi.string().optional(),
      iterations: Joi.number().optional().min(1),
    }).optional(),
  }),
};

const querySchemas = {
  pagination: Joi.object({
    limit: Joi.number().optional().min(1).max(500).default(30),
    cursor: Joi.number().optional(),
  }),
};

function validateBody(schema) {
  return (req, res, next) => {
    const {error, value} = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message),
      });
    }
    req.body = value;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const {error, value} = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message),
      });
    }
    req.query = value;
    next();
  };
}

module.exports = {
  testSchemas,
  querySchemas,
  validateBody,
  validateQuery,
};
