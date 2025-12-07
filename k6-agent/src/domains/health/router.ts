import express from 'express';
import {asyncHandler} from '../../shared/asyncHandler';

const router = express.Router();

router.get('/', asyncHandler(async (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}));

export default router;
