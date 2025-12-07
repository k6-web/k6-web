const express = require('express');
const asyncHandler = require('../commons/asyncHandler');
const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}));

module.exports = router;
