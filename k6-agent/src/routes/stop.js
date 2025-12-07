const express = require('express');
const {stopTest, getRunningTest} = require('../services/testExecutionService');
const {TestStatus} = require('../config/constants');

const router = express.Router();

router.post('/:testId', (req, res) => {
    const testId = req.params.testId;

    if (!getRunningTest(testId)) {
        return res.status(404).json({
            error: 'Test not found or not running'
        });
    }

    try {
        const success = stopTest(testId);

        if (success) {
            res.json({
                testId,
                message: 'Test stop signal sent',
                status: TestStatus.STOPPED
            });
        } else {
            res.status(500).json({
                error: 'Failed to stop test'
            });
        }
    } catch (err) {
        res.status(500).json({
            error: `Failed to stop test: ${err.message}`
        });
    }
});

module.exports = router;

