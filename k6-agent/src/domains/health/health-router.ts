import express from 'express';
import {asyncHandler} from '@shared/http/async-handler';

const healthRouter = express.Router();

healthRouter.get('/', asyncHandler(async (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}));

export default healthRouter;
