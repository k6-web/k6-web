const express = require('express');
const {stopAllTests} = require('../services/testExecutionService');

const router = express.Router();

router.post('/', (req, res) => {
    const stoppedTests = stopAllTests();

    res.json({
        message: `Stopped ${stoppedTests.length} tests`,
        stoppedTests
    });
});

module.exports = router;

