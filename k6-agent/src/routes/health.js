const express = require('express');
const {getAllTestResults} = require('../services/testResultService');
const {getAllRunningTests} = require('../services/testExecutionService');

const router = express.Router();

router.get('/health', (req, res) => {
    const totalTests = getAllTestResults().length;
    const runningTests = getAllRunningTests();

    res.json({
        status: 'ok',
        runningTests: runningTests.size,
        totalTests
    });
});

module.exports = router;

